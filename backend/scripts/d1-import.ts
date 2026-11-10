import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPostgresPool,
  databaseHost,
  administrativeDatabaseUrl,
} from "../src/database";
import { importSnapshot, type Snapshot } from "./d1-snapshot";
if (process.env.NODE_ENV !== "production" && existsSync(".env"))
  process.loadEnvFile(".env");
process.env.DATABASE_URL = administrativeDatabaseUrl();
const source = process.argv.find(
  (arg, index) => index > 1 && !arg.startsWith("--"),
);
if (!source || !process.env.DATABASE_URL)
  throw new Error(
    "Pass a protected D1 JSON snapshot and configure DATABASE_URL",
  );
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(
    databaseHost(process.env.DATABASE_URL),
  ) &&
  !process.argv.includes("--allow-remote")
)
  throw new Error(
    "Use --allow-remote explicitly for an intended remote destination",
  );
const pool = createPostgresPool(process.env.DATABASE_URL);
try {
  const snapshot = JSON.parse(
    readFileSync(resolve(source), "utf8"),
  ) as Snapshot;
  const result = await importSnapshot(
    pool,
    snapshot,
    process.argv.includes("--apply"),
  );
  console.log(
    result.applied
      ? "Imported and verified every source table; D1 remains intact."
      : result.identical
        ? "Destination already matches this snapshot; no writes made."
        : "Dry run verified the source and an empty destination. Pass --apply to import.",
  );
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(result.manifest).map(([name, row]) => [name, row.count]),
      ),
    ),
  );
} catch (error) {
  console.error(
    error instanceof Error && !/postgresql:\/\//i.test(error.message)
      ? error.message
      : "Import failed; destination transaction rolled back.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
