import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  createPostgresPool,
  assertUtf8,
  isPooledUrl,
  databaseHost,
} from "../src/database";
if (existsSync(".env")) process.loadEnvFile(".env");
let failed = false;
let checked = 0;
for (const name of ["DATABASE_URL", "DIRECT_DATABASE_URL"] as const) {
  const url = process.env[name];
  if (!url) {
    console.log(name + ": not configured");
    continue;
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(databaseHost(url)) &&
    !process.argv.includes("--rotated-credentials")
  )
    throw new Error(
      "Rotate exposed credentials first, then explicitly pass --rotated-credentials for read-only live checks",
    );
  const pool = createPostgresPool(url);
  checked++;
  try {
    await assertUtf8(pool);
    const state = await pool.query(
      "SELECT to_regclass('public.publication_state') IS NOT NULL AS schema_ready",
    );
    console.log(
      JSON.stringify({
        variable: name,
        mode: isPooledUrl(url) ? "pooled" : "direct",
        connected: true,
        utf8: true,
        schemaReady: state.rows[0].schema_ready,
      }),
    );
    if (state.rows[0].schema_ready) {
      const data = await pool.query(
        "SELECT revision FROM public.publication_state WHERE id=1",
      );
      console.log({ revision: data.rows[0]?.revision });
    }
    const tracker = await pool.query(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
    );
    const applied = tracker.rows[0].present
      ? (await pool.query("SELECT name,checksum FROM public.schema_migrations"))
          .rows
      : [];
    const directory = new URL("../postgres-migrations/", import.meta.url);
    const migrations = [];
    for (const file of (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const checksum = createHash("sha256")
        .update(await readFile(new URL(file, directory), "utf8"))
        .digest("hex");
      const row = applied.find((item) => item.name === file);
      const status = !row
        ? "pending"
        : row.checksum === checksum
          ? "applied"
          : "checksum_mismatch";
      if (status === "checksum_mismatch") failed = true;
      migrations.push({ name: file, status });
    }
    console.log({ variable: name, migrations });
  } catch (error) {
    failed = true;
    console.error({
      variable: name,
      connected: false,
      code: (error as { code?: string }).code ?? "connection_or_schema_error",
    });
  } finally {
    await pool.end();
  }
}
if (!checked) {
  failed = true;
  console.error("No database connection is configured");
}
if (failed) process.exitCode = 1;
