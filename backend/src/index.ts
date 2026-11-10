import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { streamSSE } from "hono/streaming";
import { inquirySchema, type SettingsContent } from "../../shared/schema";
import { auth } from "./auth";
import { cms, publicEntries } from "./content";
import { media } from "./media";
import { chat, inbox } from "./chat";
import { admin } from "./admin";
import { visual } from "./visual";
import type { AppEnv } from "./types";
import { id, now } from "./types";
import { guard, hash, rateLimit, visitorHash } from "./security";
import { getAssistant } from "./ai";

const app = new Hono<AppEnv>();
app.use(
  "*",
  secureHeaders({
    referrerPolicy: "no-referrer",
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
  }),
);
app.use(
  "/api/*",
  cors({
    origin: (origin, c) =>
      [c.env.PUBLIC_ORIGIN, c.env.ADMIN_ORIGIN].includes(origin) ? origin : "",
    credentials: true,
    exposeHeaders: ["ETag", "Retry-After"],
    allowHeaders: [
      "Content-Type",
      "X-Mashrouak-Request",
      "If-None-Match",
      "Last-Event-ID",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
app.use("/api/*", guard);
app.use("/api/*", async (c, next) =>
  bodyLimit({
    maxSize: c.req.path.startsWith("/api/media")
      ? 6 * 1024 * 1024
      : 1024 * 1024,
    onError: (ctx) => ctx.json({ error: "request_too_large" }, 413),
  })(c, next),
);
app.get("/healthz", async (c) => {
  await c.env.DB.prepare(
    "SELECT revision FROM publication_state WHERE id=1",
  ).first();
  return c.json({ ok: true, service: "mashrouak-api", database: "postgresql" });
});
app.get("/api/health", (c) => c.json({ ok: true, service: "mashrouak-api" }));
app.get("/api/public/content", async (c) => {
  const snapshot = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT revision,updated_at FROM publication_state WHERE id=1",
    ),
    c.env.DB.prepare(
      "SELECT id,kind,COALESCE(published_slug,slug) AS slug,COALESCE(published_sort_order,sort_order) AS sort_order,published FROM content WHERE published IS NOT NULL AND status='published' AND kind!='knowledge' ORDER BY sort_order,slug",
    ),
  ]);
  const state = snapshot[0]!.results[0] as {
    revision: number;
    updated_at: string;
  };
  const minimum = Number(c.req.query("min_revision") || 0);
  if (!Number.isSafeInteger(minimum) || minimum < 0)
    throw new HTTPException(422, { message: "invalid_revision" });
  if (state.revision < minimum)
    throw new HTTPException(409, { message: "publication_not_ready" });
  const entries = snapshot[1]!.results.map(({ published, ...row }) => ({
    ...row,
    data: JSON.parse(published as string),
  }));
  c.header("Cache-Control", "private, no-cache, must-revalidate");
  c.header("CDN-Cache-Control", "no-store");
  c.header("ETag", `"cms-${state.revision}"`);
  return c.json({
    entries,
    revision: state.revision,
    updatedAt: state.updated_at,
    aiConfigured: !!getAssistant(c.env),
  });
});
app.get("/api/public/revision", async (c) => {
  const state = await c.env.DB.prepare(
    "SELECT revision,updated_at FROM publication_state WHERE id=1",
  ).first<{ revision: number; updated_at: string }>();
  const etag = `"cms-${state?.revision ?? 0}"`;
  c.header("Cache-Control", "private, no-cache, must-revalidate");
  c.header("CDN-Cache-Control", "no-store");
  c.header("ETag", etag);
  if (c.req.header("If-None-Match") === etag) return c.body(null, 304);
  return c.json({
    revision: state?.revision ?? 0,
    updatedAt: state?.updated_at,
  });
});
app.get("/api/public/events", (c) => {
  const events = c.env.PUBLICATION_EVENTS;
  if (!events) return c.body(null,204);
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async (stream) => {
    const send = (revision: number) => {
      void stream
        .writeSSE({
          event: "publication",
          id: String(revision),
          data: JSON.stringify({ revision }),
        })
        .catch(() => {});
    };
    const unsubscribe = events.subscribe(send);
    const shutdown = () => {
      void stream.close();
    };
    c.env.SHUTDOWN_SIGNAL?.addEventListener("abort", shutdown, { once: true });
    stream.onAbort(unsubscribe);
    try {
      const state = await c.env.DB.prepare(
        "SELECT revision FROM publication_state WHERE id=1",
      ).first<{ revision: number }>();
      send(state?.revision ?? 0);
      while (!stream.aborted && !c.env.SHUTDOWN_SIGNAL?.aborted) {
        await stream.write(": keepalive\n\n");
        await stream.sleep(15000);
      }
    } finally {
      unsubscribe();
      c.env.SHUTDOWN_SIGNAL?.removeEventListener("abort", shutdown);
    }
  });
});
app.get("/api/preview/:token", async (c) => {
  const snapshot = await c.env.DB.prepare(
    "SELECT snapshot FROM preview_snapshots WHERE token_hash=? AND expires_at>?",
  )
    .bind(await hash(c.req.param("token")), Date.now())
    .first<{ snapshot: string }>();
  if (snapshot)
    return c.json({
      entries: JSON.parse(snapshot.snapshot),
      updatedAt: now(),
      aiConfigured: false,
    });
  const row = await c.env.DB.prepare(
    "SELECT c.id,c.kind,c.slug,c.sort_order,c.draft FROM preview_tokens p JOIN content c ON c.id=p.content_id WHERE p.token_hash=? AND p.expires_at>?",
  )
    .bind(await hash(c.req.param("token")), Date.now())
    .first<{
      id: string;
      kind: string;
      slug: string;
      sort_order: number;
      draft: string;
    }>();
  if (!row) throw new HTTPException(404, { message: "preview_expired" });
  const entries = await publicEntries(c);
  return c.json({
    entries: [
      ...entries.filter((e) => e.id !== row.id),
      {
        id: row.id,
        kind: row.kind,
        slug: row.slug,
        sort_order: row.sort_order,
        data: JSON.parse(row.draft),
      },
    ],
    updatedAt: now(),
    aiConfigured: false,
  });
});
app.post("/api/inquiries", async (c) => {
  await rateLimit(c, "inquiry", 5, 3600);
  const input = inquirySchema.parse(await c.req.json());
  const visitor = await visitorHash(c, true);
  const conversationId = id();
  const body = `Project enquiry\nName: ${input.fullName}\nEmail: ${input.email}\nBusiness: ${input.businessName ?? ""}\nService: ${input.serviceType}\n${input.projectDescription}\nBudget: ${input.budget ?? ""}\nTimeline: ${input.timeline ?? ""}\n${input.additionalDetails ?? ""}`;
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO conversations(id,visitor_hash,name,email,language,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
    ).bind(
      conversationId,
      visitor,
      input.fullName,
      input.email,
      input.language,
      now(),
      now(),
    ),
    c.env.DB.prepare(
      "INSERT INTO messages(id,conversation_id,sender,body,client_id,created_at) VALUES(?,?,'visitor',?,?,?)",
    ).bind(id(), conversationId, body, id(), now()),
  ]);
  return c.json({ ok: true, conversationId }, 201);
});
app.get("/api/sitemap.xml", async (c) => {
  if (!c.env.SITE_URL)
    return c.text("Set SITE_URL before generating the sitemap", 503);
  const entries = await publicEntries(c);
  const routes = [
    "/",
    "/services",
    "/work",
    "/results",
    "/about",
    "/process",
    "/contact",
    "/privacy",
    "/terms",
    ...entries
      .filter((e) => e.kind === "projects")
      .map((e) => `/work/${e.slug}`),
    ...entries
      .filter(
        (e) =>
          e.kind === "pages" &&
          ![
            "home",
            "about",
            "services",
            "process",
            "contact",
            "work",
            "results",
          ].includes(e.slug),
      )
      .map((e) => `/pages/${e.slug}`),
  ];
  const origin = c.env.SITE_URL.replace(/\/$/, "").replace(/[<>&"']/g, "");
  c.header("Content-Type", "application/xml; charset=utf-8");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((p) => `<url><loc>${origin}${p}</loc></url>`).join("")}</urlset>`,
  );
});
app.get("/api/public/settings", async (c) => {
  const entries = await publicEntries(c);
  return c.json({
    settings:
      (entries.find((e) => e.kind === "settings")?.data as
        SettingsContent | undefined) ?? null,
  });
});
app.route("/api/auth", auth);
app.route("/api/admin/content", cms);
app.route("/api/admin/visual", visual);
app.route("/api/media", media);
app.route("/api/chat", chat);
app.route("/api/admin/inbox", inbox);
app.route("/api/admin", admin);
app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((error, c) => {
  if (error instanceof ZodError)
    return c.json(
      {
        error: "validation_failed",
        issues: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      422,
    );
  if (error instanceof HTTPException)
    return c.json({ error: error.message }, error.status);
  if (error instanceof SyntaxError)
    return c.json({ error: "invalid_json" }, 400);
  if (
    (error as { code?: string }).code === "23505" ||
    error.message.includes("UNIQUE constraint")
  )
    return c.json({ error: "already_exists" }, 409);
  console.error("API request failed", { path: c.req.path, name: error.name });
  return c.json({ error: "server_error" }, 500);
});
export { app };
export default app;
