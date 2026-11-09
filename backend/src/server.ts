import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {clientIp} from './client-ip';
import { serve } from "@hono/node-server";
import { app } from "./index";
import { assertUtf8, createPostgresPool, PostgresDatabase } from "./database";
import { runCleanup } from "./scheduler";
import { PostgresPublicationEvents } from "./publication";
import type { Env } from "./types";

if (process.env.NODE_ENV !== "production" && existsSync(resolve('.env'))) process.loadEnvFile(resolve('.env'));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const pool = createPostgresPool(databaseUrl);
await assertUtf8(pool);
const production = process.env.NODE_ENV === "production";
const origin = (value: string | undefined, fallback: string) => {
  const url = new URL(value || fallback);
  if (production && url.protocol !== "https:") throw new Error("Production origins must use HTTPS");
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error("Origins must contain only scheme and hostname");
  return url.origin;
};
const env: Env = {
  DB: new PostgresDatabase(pool), ENVIRONMENT: production ? "production" : "development",
  PUBLIC_ORIGIN: origin(process.env.PUBLIC_ORIGIN, "http://localhost:5173"),
  ADMIN_ORIGIN: origin(process.env.ADMIN_ORIGIN, "http://localhost:5174"),
  SITE_URL: process.env.SITE_URL || process.env.PUBLIC_ORIGIN || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER,
  AI_PROVIDER: process.env.AI_PROVIDER || "none", AI_API_KEY: process.env.AI_API_KEY, AI_BASE_URL: process.env.AI_BASE_URL,
  AI_MODEL: process.env.AI_MODEL, CHAT_RETENTION_DAYS: process.env.CHAT_RETENTION_DAYS || "90",
};
const shutdownSignal = new AbortController();
const publicationEvents = new PostgresPublicationEvents(pool);
await publicationEvents.start();
env.PUBLICATION_EVENTS = publicationEvents;
env.SHUTDOWN_SIGNAL = shutdownSignal.signal;
await pool.query("SELECT 1");
let cleanup: Promise<void> | null = null;
async function scheduledCleanup() {
  if (cleanup) return;
  cleanup = (async () => {
    const client = await pool.connect();
    try {
      const lock = await client.query("SELECT pg_try_advisory_lock(hashtext('mashrouak_hourly_cleanup')) AS acquired");
      if (!lock.rows[0].acquired) return;
      const previous = await client.query("SELECT last_completed_at FROM scheduled_jobs WHERE name='cleanup'");
      if (previous.rows.length && Date.now() - new Date(previous.rows[0].last_completed_at).getTime() < 3600000) return;
      await runCleanup(env);
      await client.query("INSERT INTO scheduled_jobs(name,last_completed_at) VALUES('cleanup',now()) ON CONFLICT(name) DO UPDATE SET last_completed_at=excluded.last_completed_at");
    } finally { await client.query("SELECT pg_advisory_unlock(hashtext('mashrouak_hourly_cleanup'))").catch(() => {}); client.release(); }
  })().catch(() => console.error("Scheduled cleanup failed; retrying on the next interval")).finally(() => { cleanup = null; });
  await cleanup;
}
const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const server = serve({ hostname: "0.0.0.0", port,
  fetch: (request, context) => {
    const socket = context.incoming.socket.remoteAddress || "local";
    return app.fetch(request, { ...env, CLIENT_IP: clientIp(request,socket,production,process.env.PAGES_PROXY_SECRET) });
  },
});
console.log(`Mashrouak API listening on port ${port}`);
void scheduledCleanup();
const timer = setInterval(() => { void scheduledCleanup(); }, 60000);
timer.unref();
let stopping = false;
async function shutdown() {
  if (stopping) return; stopping = true; clearInterval(timer); shutdownSignal.abort();
  const deadline = setTimeout(() => process.exit(1), 15000); deadline.unref();
  server.close(async () => { await cleanup; await publicationEvents.stop(); await pool.end(); clearTimeout(deadline); process.exit(0); });
  if ("closeIdleConnections" in server) server.closeIdleConnections();
}
process.on("SIGTERM", () => { void shutdown(); });
process.on("SIGINT", () => { void shutdown(); });
