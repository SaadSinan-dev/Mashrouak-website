import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppEnv } from "./types";
import { id } from "./types";
import {
  auditStatement,
  authorize,
  checkPassword,
  cookie,
  hash,
  passwordHash,
  rateLimit,
} from "./security";

export const auth = new Hono<AppEnv>();
auth.post("/login", async (c) => {
  await rateLimit(c, "login", 8, 900);
  const input = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
    .strict()
    .parse(await c.req.json());
  await rateLimit(c, "login-account", 12, 900, input.email.toLowerCase());
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE email=? AND active=1",
  )
    .bind(input.email.toLowerCase())
    .first<{ id: string; password_hash: string }>();
  // Perform the same expensive operation for unknown users to reduce account enumeration.
  const valid = user
    ? await checkPassword(input.password, user.password_hash)
    : (await passwordHash(input.password), false);
  if (!user || !valid)
    throw new HTTPException(401, { message: "invalid_credentials" });
  const token = `${id()}${id()}`;
  await c.env.DB.prepare(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
  )
    .bind(await hash(token), user.id, Date.now() + 8 * 3600000)
    .run();
  cookie(c, "mashrouak_admin", token, 8 * 3600);
  await c.env.DB.prepare(
    "INSERT INTO audit_logs(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)",
  )
    .bind(id(), user.id, "auth.login", user.id, new Date().toISOString())
    .run();
  return c.json({ ok: true });
});
auth.get("/me", authorize(["owner", "editor", "support"]), (c) =>
  c.json({ user: c.get("user") }),
);
auth.post("/logout", async (c) => {
  const token = getCookie(c, "mashrouak_admin");
  if (token)
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await hash(token))
      .run();
  cookie(c, "mashrouak_admin", "", 0);
  return c.json({ ok: true });
});
auth.post("/password", authorize(["owner", "editor", "support"]), async (c) => {
  await rateLimit(c, "password", 5, 900, c.get("user").id);
  const input = z
    .object({
      currentPassword: z.string().max(256),
      password: z.string().min(14).max(256),
    })
    .strict()
    .parse(await c.req.json());
  const row = await c.env.DB.prepare(
    "SELECT password_hash FROM users WHERE id=?",
  )
    .bind(c.get("user").id)
    .first<{ password_hash: string }>();
  if (!row || !(await checkPassword(input.currentPassword, row.password_hash)))
    throw new HTTPException(401, { message: "invalid_credentials" });
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(
      await passwordHash(input.password),
      c.get("user").id,
    ),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(
      c.get("user").id,
    ),
    auditStatement(c, "auth.password", c.get("user").id),
  ]);
  cookie(c, "mashrouak_admin", "", 0);
  return c.json({ ok: true });
});
