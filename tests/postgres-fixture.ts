import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { once } from "node:events";
import { serve } from "@hono/node-server";
import { app } from "../backend/src/index";
import { createPostgresPool, PostgresDatabase } from "../backend/src/database";
import { migratePostgres } from "../backend/src/migrations";
import { PostgresPublicationEvents } from "../backend/src/publication";
import { runCleanup } from "../backend/src/scheduler";
import { seedPostgres } from "../backend/src/seed-content";
import type { Env } from "../backend/src/types";
import { CloudinaryMock, mockCloudinaryCredentials } from "./cloudinary.mock";

export async function createTestPlatform(
  options: {
    cloudinary?: CloudinaryMock;
    credentials?: boolean;
    seed?: boolean;
    port?: number;
    http?: boolean;
    adminOrigin?: string;
    publicOrigin?: string;
  } = {},
) {
  const configured = existsSync("backend/.env")
    ? parseEnv(readFileSync("backend/.env", "utf8"))
    : {};
  const url = process.env.TEST_DATABASE_URL || configured.DATABASE_URL;
  if (
    !url ||
    !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)
  )
    throw new Error(
      "Integration tests require a local PostgreSQL URL. Remote databases are never modified by tests.",
    );
  const schema = `qa_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = createPostgresPool(url);
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = createPostgresPool(url, schema);
  const db = new PostgresDatabase(pool);
  await migratePostgres(pool);
  const provider = options.cloudinary ?? new CloudinaryMock();
  const events = new PostgresPublicationEvents(pool, `cms_${schema}`);
  await events.start();
  if (options.seed) await seedPostgres(db, events.channel);
  const shutdown = new AbortController();
  const env: Env = {
    ...mockCloudinaryCredentials,
    DB: db,
    PUBLICATION_EVENTS: events,
    SHUTDOWN_SIGNAL: shutdown.signal,
    CLOUDINARY_API_SECRET:
      options.credentials === false
        ? ""
        : mockCloudinaryCredentials.CLOUDINARY_API_SECRET,
    CLOUDINARY_FETCH: async (input, init) =>
      provider.fetch(new Request(input, init)),
    PUBLIC_ORIGIN: options.publicOrigin ?? "http://localhost:5173",
    ADMIN_ORIGIN: options.adminOrigin ?? "http://localhost:5174",
    ENVIRONMENT: "development",
    AI_PROVIDER: "none",
    CHAT_RETENTION_DAYS: "90",
    SITE_URL: "https://mashrouak.net",
  };
  const dispatchFetch = (input: string | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    return app.fetch(request, {
      ...env,
      CLIENT_IP: request.headers.get("CF-Connecting-IP") ?? "test",
    });
  };
  const server = options.http
    ? serve({
        hostname: "127.0.0.1",
        port: options.port ?? 0,
        fetch: (request) => dispatchFetch(request),
      })
    : null;
  if (server && !server.listening) await once(server, "listening");
  const address = server?.address();
  const origin =
    address && typeof address === "object"
      ? `http://127.0.0.1:${address.port}`
      : "";
  return {
    env,
    db,
    pool,
    provider,
    origin,
    dispatchFetch,
    getDatabase: async () => db,
    runScheduled: async () => {
      await runCleanup(env);
      return { outcome: "ok" };
    },
    async dispose() {
      shutdown.abort();
      if (server)
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
          if ("closeAllConnections" in server) server.closeAllConnections();
        });
      await events.stop();
      await pool.end();
      if (!/^qa_[a-f0-9]{32}$/.test(schema))
        throw new Error("Refusing unsafe test cleanup");
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
