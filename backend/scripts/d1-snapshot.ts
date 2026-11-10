import { createHash } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { globSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { Pool } from "pg";
export const migrationTables = [
  "users",
  "sessions",
  "content",
  "revisions",
  "audit_logs",
  "conversations",
  "messages",
  "media",
  "rate_limits",
  "preview_tokens",
  "media_cleanup",
] as const;
export type Snapshot = {
  format: "mashrouak-d1-v1";
  createdAt: string;
  source: "local" | "remote";
  tables: Record<string, Record<string, unknown>[]>;
  manifest: Record<string, { count: number; sha256: string }>;
};
const timestampKeys = new Set([
  "created_at",
  "updated_at",
  "read_at",
  "last_completed_at",
]);
export function canonicalTimestamp(value: unknown) {
  const source = String(value);
  // SQLite CURRENT_TIMESTAMP is UTC even though it omits the timezone suffix.
  const explicit = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(
    source,
  )
    ? source.replace(" ", "T") + "Z"
    : source;
  return new Date(explicit).toISOString();
}
export function rowDigest(rows: Record<string, unknown>[]) {
  const canonical = rows.map((row) =>
    Object.fromEntries(
      Object.keys(row)
        .sort()
        .map((key) => [
          key,
          timestampKeys.has(key) && row[key]
            ? canonicalTimestamp(row[key])
            : row[key],
        ]),
    ),
  );
  const sorted = canonical.map((row) => JSON.stringify(row)).sort();
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}
export function finishSnapshot(
  tables: Snapshot["tables"],
  source: Snapshot["source"],
): Snapshot {
  return {
    format: "mashrouak-d1-v1",
    createdAt: new Date().toISOString(),
    source,
    tables,
    manifest: Object.fromEntries(
      migrationTables.map((table) => [
        table,
        {
          count: tables[table]?.length ?? 0,
          sha256: rowDigest(tables[table] ?? []),
        },
      ]),
    ),
  };
}
export async function exportLocalSnapshot(backend: string, output: string) {
  const databases: { path: string; upgraded: boolean }[] = [];
  for (const file of globSync(
    resolve(backend, ".wrangler/state/v3/d1/**/*.sqlite").replaceAll("\\", "/"),
  )) {
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      if (db.prepare("SELECT name FROM sqlite_master WHERE name='media'").get())
        databases.push({
          path: file,
          upgraded: db
            .prepare("PRAGMA table_info(media)")
            .all()
            .some((column) => column.name === "cloudinary_public_id"),
        });
    } finally {
      db.close();
    }
  }
  const upgraded = databases.filter((db) => db.upgraded),
    selected = upgraded.length ? upgraded : databases;
  if (selected.length !== 1)
    throw new Error("D1 source is missing or ambiguous; no data changed");
  mkdirSync(dirname(output), { recursive: true });
  const source = new DatabaseSync(selected[0]!.path, { readOnly: true });
  const backupPath = output + ".sqlite";
  try {
    await backup(source, backupPath);
  } finally {
    source.close();
  }
  const snapshotDb = new DatabaseSync(backupPath, { readOnly: true });
  const tables: Snapshot["tables"] = {};
  try {
    const names = snapshotDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row) => String(row.name));
    const unknown = names.filter(
      (name) =>
        !name.startsWith("sqlite_") &&
        !name.startsWith("_cf_") &&
        name !== "d1_migrations" &&
        !migrationTables.includes(name as (typeof migrationTables)[number]),
    );
    if (unknown.length)
      throw new Error(
        "Unmapped source tables need review: " + unknown.join(", "),
      );
    for (const table of migrationTables)
      tables[table] = names.includes(table)
        ? (snapshotDb.prepare(`SELECT * FROM ${table}`).all() as Record<
            string,
            unknown
          >[])
        : [];
  } finally {
    snapshotDb.close();
  }
  const snapshot = finishSnapshot(tables, "local");
  writeFileSync(output, JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
  return snapshot;
}
export async function importSnapshot(
  pool: Pool,
  snapshot: Snapshot,
  apply = false,
) {
  if (snapshot.format !== "mashrouak-d1-v1")
    throw new Error("Unsupported migration format");
  if (
    Object.keys(snapshot.tables).some(
      (table) =>
        !migrationTables.includes(table as (typeof migrationTables)[number]),
    )
  )
    throw new Error("Unmapped snapshot table");
  for (const table of migrationTables) {
    const rows = snapshot.tables[table] ?? [];
    if (
      snapshot.manifest[table]?.count !== rows.length ||
      snapshot.manifest[table]?.sha256 !== rowDigest(rows)
    )
      throw new Error("Source manifest verification failed: " + table);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('mashrouak_data_import'))",
    );
    await client.query(
      `LOCK TABLE ${migrationTables.join(",")} IN EXCLUSIVE MODE`,
    );
    let empty = true,
      identical = true;
    for (const table of migrationTables) {
      const current = await client.query(`SELECT * FROM ${table}`);
      if (current.rows.length) empty = false;
      const columns = Object.keys(snapshot.tables[table]?.[0] ?? {});
      const comparable = current.rows.map((row) =>
        Object.fromEntries(columns.map((column) => [column, row[column]])),
      );
      if (
        current.rows.length !== snapshot.manifest[table]!.count ||
        rowDigest(comparable) !== snapshot.manifest[table]!.sha256
      )
        identical = false;
    }
    if (!empty && !identical)
      throw new Error(
        "Destination contains different records. Import refuses to overwrite or reset them.",
      );
    if (!apply || identical) {
      await client.query("ROLLBACK");
      return { applied: false, identical, manifest: snapshot.manifest };
    }
    for (const table of migrationTables) {
      const permitted = (
        await client.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1",
          [table],
        )
      ).rows.map((row) => row.column_name);
      for (const row of snapshot.tables[table] ?? []) {
        const columns = Object.keys(row);
        if (
          columns.some(
            (column) =>
              !permitted.includes(column) || !/^[a-z_]+$/.test(column),
          )
        )
          throw new Error("Unmapped source columns: " + table);
        await client.query(
          `INSERT INTO ${table}(${columns.map((column) => '"' + column + '"').join(",")}) VALUES(${columns.map((_, index) => "$" + (index + 1)).join(",")})`,
          columns.map((column) =>
            timestampKeys.has(column) && row[column]
              ? canonicalTimestamp(row[column])
              : row[column],
          ),
        );
      }
    }
    for (const table of migrationTables) {
      const columns = Object.keys(snapshot.tables[table]?.[0] ?? {});
      const result = await client.query(
        `SELECT ${columns.length ? columns.map((column) => '"' + column + '"').join(",") : "*"} FROM ${table}`,
      );
      if (
        result.rows.length !== snapshot.manifest[table]!.count ||
        rowDigest(result.rows) !== snapshot.manifest[table]!.sha256
      )
        throw new Error("Destination integrity check failed: " + table);
    }
    await client.query(
      "UPDATE content SET published_slug=slug,published_sort_order=sort_order WHERE published IS NOT NULL AND published_slug IS NULL",
    );
    await client.query(
      "UPDATE publication_state SET revision=revision+1,updated_at=now() WHERE id=1",
    );
    await client.query("COMMIT");
    return { applied: true, identical: false, manifest: snapshot.manifest };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
