import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { assertUtf8 } from './database';
export async function migratePostgres(pool: Pool) {
  await assertUtf8(pool);
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('mashrouak_schema_migrations'))");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    const directory = new URL("../postgres-migrations/", import.meta.url);
    for (const name of (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()) {
      const sql = await readFile(new URL(name, directory), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = await client.query("SELECT checksum FROM schema_migrations WHERE name=$1", [name]);
      if (previous.rows.length) { if (previous.rows[0].checksum !== checksum) throw new Error("migration_checksum_mismatch"); continue; }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)", [name, checksum]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('mashrouak_schema_migrations'))").catch(() => {});
    client.release();
  }
}
