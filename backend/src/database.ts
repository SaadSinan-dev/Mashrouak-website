import { Pool, types as pgTypes, type PoolClient, type QueryResultRow } from "pg";

export interface QueryResult<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  run(): Promise<QueryResult>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<QueryResult[]>;
  atomic<T>(work: (database: Database) => Promise<T>): Promise<T>;
}

// The application repository uses positional markers. Only parameter syntax is
// compiled here; every production query and migration uses PostgreSQL semantics.
export function postgresParameters(sql: string) {
  let parameter = 0, quote = "", output = "", comment = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]!;
    if (comment) {
      output += char;
      if (comment === "line" && char === "\n") comment = "";
      else if (comment === "block" && char === "*" && sql[i + 1] === "/") { output += "/"; i++; comment = ""; }
    } else if (quote) {
      output += char;
      if (char === quote) { if (sql[i + 1] === quote) { output += char; i++; } else quote = ""; }
    } else if (char === "'" || char === '"') { quote = char; output += char; }
    else if (char === "-" && sql[i + 1] === "-") { comment = "line"; output += "--"; i++; }
    else if (char === "/" && sql[i + 1] === "*") { comment = "block"; output += "/*"; i++; }
    else output += char === "?" ? `$${++parameter}` : char;
  }
  return output;
}
function normalize(row: QueryResultRow) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    value instanceof Date ? value.toISOString() :
      typeof value === "bigint" ? Number(value) : value,
  ]));
}
const retryable = (error: unknown) => ["40001", "40P01"].includes((error as { code?: string })?.code ?? "");
export class PostgresDatabase implements Database {
  constructor(readonly pool: Pool, private readonly transaction?: PoolClient) {}
  prepare(sql: string): Statement { return new PostgresStatement(this, postgresParameters(sql)); }
  async execute(sql: string, values: unknown[], client?: PoolClient): Promise<QueryResult> {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await (client ?? this.transaction ?? this.pool).query(sql, values);
        return { results: result.rows.map(normalize), meta: { changes: result.rowCount ?? 0 } };
      } catch (error) {
        if (!retryable(error)) console.error("Database query failed", {code:(error as {code?:string}).code ?? "database_unavailable"});
        if (client || this.transaction || !retryable(error) || attempt >= 2) throw error;
      }
    }
  }
  async batch(statements: Statement[]): Promise<QueryResult[]> {
    if (this.transaction) {
      const results: QueryResult[] = [];
      for (const statement of statements) {
        if (!(statement instanceof PostgresStatement) || statement.database !== this) throw new Error("transaction_database_mismatch");
        results.push(await this.execute(statement.sql, statement.values));
      }
      return results;
    }
    for (let attempt = 0; ; attempt++) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const results: QueryResult[] = [];
        for (const statement of statements) {
          if (!(statement instanceof PostgresStatement) || statement.database !== this) throw new Error("transaction_database_mismatch");
          results.push(await this.execute(statement.sql, statement.values, client));
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        if (!retryable(error) || attempt >= 2) throw error;
      } finally { client.release(); }
    }
  }
  async atomic<T>(work: (database: Database) => Promise<T>): Promise<T> {
    if (this.transaction) return work(this);
    for (let attempt = 0; ; attempt++) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        const result = await work(new PostgresDatabase(this.pool, client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        if (!retryable(error) || attempt >= 2) throw error;
      } finally { client.release(); }
    }
  }
}
export async function assertUtf8(pool: Pool) {
  const result = await pool.query('SHOW server_encoding');
  if (result.rows[0]?.server_encoding !== 'UTF8') throw new Error('PostgreSQL database must use UTF8 for Arabic and English content');
}
class PostgresStatement implements Statement {
  constructor(readonly database: PostgresDatabase, readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new PostgresStatement(this.database, this.sql, values); }
  async first<T = Record<string, unknown>>() { return (await this.all<T>()).results[0] ?? null; }
  async all<T = Record<string, unknown>>() { return await this.database.execute(this.sql, this.values) as QueryResult<T>; }
  run() { return this.database.execute(this.sql, this.values); }
}
export function createPostgresPool(connectionString: string, schema = "public") {
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error("invalid_database_schema");
  pgTypes.setTypeParser(20, (value) => { const number = Number(value); if (!Number.isSafeInteger(number)) throw new Error("database_integer_out_of_range"); return number; });
  pgTypes.setTypeParser(1184, (value) => new Date(value).toISOString());
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000,
    options: `-c search_path=${schema} -c default_transaction_isolation=serializable -c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000`,
  });
  pool.on("error", () => console.error("Database connection error"));
  return pool;
}
