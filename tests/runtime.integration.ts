import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { createPostgresPool } from "../backend/src/database";
import { migratePostgres } from "../backend/src/migrations";
const source = parseEnv(readFileSync("backend/.env", "utf8")).DATABASE_URL!;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(source).hostname))
  throw new Error("Runtime tests require local PostgreSQL");
const name = "qa_runtime_" + crypto.randomUUID().replaceAll("-", ""),
  admin = createPostgresPool(source);
if (!/^qa_runtime_[a-f0-9]{32}$/.test(name))
  throw new Error("Invalid generated test name");
await admin.query(
  `CREATE DATABASE ${name} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
);
const url = new URL(source);
url.pathname = "/" + name;
const pool = createPostgresPool(url.toString());
let child: ReturnType<typeof spawn> | undefined,
  logs = "";
try {
  await migratePostgres(pool);
  await pool.end();
  child = spawn(process.execPath, ["dist/server.js"], {
    cwd: "backend",
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: url.toString(),
      DIRECT_DATABASE_URL: "",
      PORT: "8798",
      PUBLIC_ORIGIN: "https://public.example",
      ADMIN_ORIGIN: "https://admin.example",
      AI_PROVIDER: "none",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout!.on("data", (bytes) => (logs += bytes));
  child.stderr!.on("data", (bytes) => (logs += bytes));
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch("http://127.0.0.1:8798/healthz");
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (let i = 0; i < 3; i++) {
    const response = await fetch("http://127.0.0.1:8798/healthz");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).database, "postgresql");
  }
  assert.equal(child.exitCode, null);
  assert.ok(
    !logs.includes("startup failed") &&
      !logs.includes("unsupported startup parameter"),
  );
  console.log(
    "PASS: compiled Node backend starts with UTF8/database readiness, answers three health checks and remains running. Isolated local database; no live Neon verification.",
  );
} finally {
  if (child) {
    child.kill();
    const stopped = child;
    await new Promise<void>((resolve) =>
      stopped.exitCode !== null
        ? resolve()
        : stopped.once("exit", () => resolve()),
    );
  }
  await pool.end().catch(() => {});
  await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
  await admin.end();
}
