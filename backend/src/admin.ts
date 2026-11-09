import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppEnv } from "./types";
import { id, now } from "./types";
import { auditStatement, authorize, passwordHash, rateLimit } from "./security";

export const admin = new Hono<AppEnv>();
admin.get("/overview", authorize(["owner", "editor", "support"]), async (c) => {
  const counts = await c.env.DB.prepare(
    "SELECT (SELECT count(*) FROM content WHERE published IS NOT NULL) AS published,(SELECT count(*) FROM content WHERE published IS NULL) AS drafts,(SELECT count(*) FROM conversations WHERE status='pending') AS pending,(SELECT count(*) FROM conversations WHERE status='active') AS active,(SELECT count(*) FROM conversations WHERE status='resolved') AS resolved,(SELECT count(*) FROM media) AS media",
  ).first();
  const content =
    c.get("user").role === "support"
      ? []
      : (
          await c.env.DB.prepare(
            "SELECT kind,count(*) AS total,sum(CASE WHEN published IS NOT NULL THEN 1 ELSE 0 END) AS published FROM content GROUP BY kind",
          ).all()
        ).results;
  return c.json({ counts, content });
});
admin.get("/operators", authorize(["owner", "support"]), async (c) =>
  c.json({
    operators: (
      await c.env.DB.prepare(
        "SELECT id,name FROM users WHERE active=1 AND role IN ('owner','support') ORDER BY name",
      ).all()
    ).results,
  }),
);
admin.get("/users", authorize(["owner"]), async (c) =>
  c.json({
    users: (
      await c.env.DB.prepare(
        "SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at",
      ).all()
    ).results,
  }),
);
admin.post("/users", authorize(["owner"]), async (c) => {
  await rateLimit(c, "create-user", 10, 3600, c.get("user").id);
  const input = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z.email().max(254),
      role: z.enum(["owner", "editor", "support"]),
      password: z.string().min(14).max(256),
    })
    .strict()
    .parse(await c.req.json());
  const userId = id();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO users(id,name,email,role,password_hash,created_at) VALUES(?,?,?,?,?,?)",
    ).bind(
      userId,
      input.name,
      input.email.toLowerCase(),
      input.role,
      await passwordHash(input.password),
      now(),
    ),
    auditStatement(c, "user.create", userId, input.role),
  ]);
  return c.json({ id: userId }, 201);
});
admin.patch("/users/:id", authorize(["owner"]), async (c) => {
  const input = z
    .object({
      name: z.string().trim().min(2).max(100),
      role: z.enum(["owner", "editor", "support"]),
      active: z.boolean(),
      password: z.string().min(14).max(256).optional(),
    })
    .strict()
    .parse(await c.req.json());
  if (
    c.req.param("id") === c.get("user").id &&
    (!input.active || input.role !== "owner")
  )
    throw new HTTPException(422, { message: "cannot_remove_own_access" });
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE id=?")
    .bind(c.req.param("id"))
    .first();
  if (!user) throw new HTTPException(404, { message: "not_found" });
  const query = input.password
    ? c.env.DB.prepare(
        "UPDATE users SET name=?,role=?,active=?,password_hash=? WHERE id=?",
      ).bind(
        input.name,
        input.role,
        Number(input.active),
        await passwordHash(input.password),
        c.req.param("id"),
      )
    : c.env.DB.prepare(
        "UPDATE users SET name=?,role=?,active=? WHERE id=?",
      ).bind(input.name, input.role, Number(input.active), c.req.param("id"));
  await c.env.DB.batch([
    query,
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(
      c.req.param("id"),
    ),
    auditStatement(c, "user.update", c.req.param("id"), input.role),
  ]);
  return c.json({ ok: true });
});
admin.get("/audit", authorize(["owner"]), async (c) =>
  c.json({
    logs: (
      await c.env.DB.prepare(
        "SELECT a.*,u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 250",
      ).all()
    ).results,
  }),
);
