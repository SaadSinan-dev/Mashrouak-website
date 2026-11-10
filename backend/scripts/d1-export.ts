import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  exportLocalSnapshot,
  finishSnapshot,
  migrationTables,
  type Snapshot,
} from "./d1-snapshot";
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputArg = process.argv.indexOf("--output");
const output =
  outputArg >= 0
    ? resolve(process.argv[outputArg + 1]!)
    : resolve(
        backend,
        ".local/migration",
        `d1-${process.argv.includes("--remote") ? "remote" : "local"}-${Date.now()}.json`,
      );
try {
  let snapshot: Snapshot;
  if (!process.argv.includes("--remote"))
    snapshot = await exportLocalSnapshot(backend, output);
  else {
    const wrangler = resolve(
      backend,
      "../node_modules/wrangler/bin/wrangler.js",
    );
    const run = (args: string[]) => {
      const result = spawnSync(process.execPath, [wrangler, ...args], {
        cwd: backend,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      if (result.status !== 0)
        throw new Error("Remote D1 export failed; source data is unchanged");
      return result.stdout;
    };
    mkdirSync(dirname(output), { recursive: true });
    run([
      "d1",
      "export",
      "mashrouak-platform",
      "--remote",
      "--config",
      "wrangler.jsonc",
      "--env",
      "production",
      "--output",
      output + ".sql",
    ]);
    const copy = new DatabaseSync(":memory:", {
      enableForeignKeyConstraints: false,
    });
    const tables: Snapshot["tables"] = {};
    try {
      copy.exec(readFileSync(output + ".sql", "utf8"));
      if (copy.prepare("PRAGMA foreign_key_check").all().length)
        throw new Error(
          "Source backup has broken relationships; review before importing",
        );
      const names = copy
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
          ? (copy.prepare(`SELECT * FROM ${table}`).all() as Record<
              string,
              unknown
            >[])
          : [];
    } finally {
      copy.close();
    }
    // JSON and hashes are derived from the exact protected SQL backup, not later reads.
    snapshot = finishSnapshot(tables, "remote");
    writeFileSync(output, JSON.stringify(snapshot), {
      flag: "wx",
      mode: 0o600,
    });
  }
  console.log("Protected D1 snapshot saved:", output);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(snapshot.manifest).map(([table, value]) => [
          table,
          value.count,
        ]),
      ),
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "D1 snapshot failed");
  process.exitCode = 1;
}
