import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { passwordHash } from "../backend/src/security";

// Local browser QA only. Random credentials live in ignored artifacts and are removed by --cleanup.
const directory = resolve("artifacts");
const credentialsPath = resolve(directory, "browser-account.json");
await mkdir(directory, { recursive: true });
const cleanup = process.argv.includes("--cleanup");
const account = cleanup
  ? JSON.parse(await readFile(credentialsPath, "utf8"))
  : {
      id: crypto.randomUUID(),
      email: `qa-${crypto.randomUUID()}@example.test`,
      password: crypto.randomUUID() + crypto.randomUUID(),
    };
const sqlPath = resolve(directory, "browser-account.sql");
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const sql = cleanup
  ? `DELETE FROM users WHERE id=${quote(account.id)};`
  : `INSERT INTO users(id,email,name,password_hash,role) VALUES(${[account.id, account.email, "Browser QA", await passwordHash(account.password), "owner"].map(quote).join(",")});`;
await writeFile(sqlPath, sql, { mode: 0o600 });
try {
  const result = spawnSync(
    process.execPath,
    [
      resolve("node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "execute",
      "mashrouak-platform",
      "--local",
      "--file",
      sqlPath,
    ],
    { cwd: resolve("backend"), stdio: "pipe" },
  );
  if (result.status !== 0)
    throw new Error(result.stderr.toString() || result.stdout.toString());
  if (cleanup) await unlink(credentialsPath);
  else
    await writeFile(credentialsPath, JSON.stringify(account), { mode: 0o600 });
  console.log(
    cleanup
      ? "Local QA account removed"
      : "Local QA account ready (credentials not printed)",
  );
} finally {
  await unlink(sqlPath);
}
