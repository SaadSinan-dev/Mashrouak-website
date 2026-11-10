import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createPostgresPool, administrativeDatabaseUrl } from "../src/database";
import { rowDigest, migrationTables } from "./d1-snapshot";
if (process.env.NODE_ENV !== "production" && existsSync(".env"))
  process.loadEnvFile(".env");
process.env.DATABASE_URL = administrativeDatabaseUrl();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = createPostgresPool(process.env.DATABASE_URL),
  client = await pool.connect();
const tables = [
  ...migrationTables,
  "publication_state",
  "preview_snapshots",
  "scheduled_jobs",
  "schema_migrations",
];
try {
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE");
  const names = (
    await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname=current_schema()",
    )
  ).rows.map((row) => row.tablename);
  if (names.some((name) => !tables.includes(name)))
    throw new Error("Unmapped database table requires backup review");
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const table of tables)
    data[table] = (await client.query(`SELECT * FROM ${table}`)).rows;
  await client.query("COMMIT");
  const output = resolve(
    process.argv[2] ?? `.local/backups/postgres-${Date.now()}.json`,
  );
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({
      format: "mashrouak-postgres-v1",
      createdAt: new Date().toISOString(),
      tables: data,
      manifest: Object.fromEntries(
        tables.map((table) => [
          table,
          { count: data[table]!.length, sha256: rowDigest(data[table]!) },
        ]),
      ),
    }),
    { flag: "wx", mode: 0o600 },
  );
  console.log("Protected consistent PostgreSQL backup saved:", output);
} catch {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Backup failed; database remains unchanged.");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
