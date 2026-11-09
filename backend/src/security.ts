import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono";
import type { Role, User } from "../../shared/schema";
import type { AppEnv, Ctx } from "./types";
import { id, now } from "./types";

export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
const hex = (value: Uint8Array) =>
  Array.from(value, (b) => b.toString(16).padStart(2, "0")).join("");
export async function passwordHash(
  password: string,
  salt = hex(crypto.getRandomValues(new Uint8Array(32))),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return `pbkdf2:100000:${salt}:${hex(new Uint8Array(bits))}`;
}
export async function checkPassword(password: string, stored: string) {
  const salt = stored.split(":")[2];
  if (!salt) return false;
  const actual = await passwordHash(password, salt);
  let diff = actual.length ^ stored.length;
  for (let i = 0; i < actual.length; i++)
    diff |= actual.charCodeAt(i) ^ (stored.charCodeAt(i) || 0);
  return diff === 0;
}
export function cookie(c: Ctx, name: string, value: string, maxAge: number) {
  setCookie(c, name, value, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === "production",
    sameSite: "Strict",
    path: "/api",
    maxAge,
  });
}
export async function currentUser(c: Ctx): Promise<User | null> {
  const token = getCookie(c, "mashrouak_admin");
  if (!token) return null;
  return c.env.DB.prepare(
    "SELECT u.id,u.email,u.name,u.role,u.active FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
  )
    .bind(await hash(token), Date.now())
    .first<User>();
}
export function authorize(roles: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = await currentUser(c);
    if (!user)
      throw new HTTPException(401, { message: "authentication_required" });
    if (!roles.includes(user.role))
      throw new HTTPException(403, { message: "permission_denied" });
    c.set("user", user);
    await next();
  };
}
export async function rateLimit(
  c: Ctx,
  scope: string,
  limit: number,
  seconds: number,
  identity?: string,
) {
  const epoch = Math.floor(Date.now() / (seconds * 1000));
  const key = `${scope}:${await hash(identity ?? c.env.CLIENT_IP ?? "local")}:${epoch}`;
  const row = await c.env.DB.prepare(
    "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count",
  )
    .bind(key, (epoch + 1) * seconds * 1000)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > limit) {
    c.header("Retry-After", String(seconds));
    throw new HTTPException(429, { message: "rate_limited" });
  }
}
export async function visitorHash(c: Ctx, create = false) {
  let token = getCookie(c, "mashrouak_visitor");
  if (!token && create) {
    token = `${id()}${id()}`;
    cookie(c, "mashrouak_visitor", token, 30 * 86400);
  }
  if (!token)
    throw new HTTPException(401, { message: "visitor_session_required" });
  return hash(token);
}
export function auditStatement(
  c: Ctx,
  action: string,
  target: string,
  detail = "",
) {
  return c.env.DB.prepare(
    "INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) VALUES(?,?,?,?,?,?)",
  ).bind(id(), c.get("user")?.id ?? null, action, target, detail, now());
}
export const guard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header("Origin");
  const allowed = [c.env.PUBLIC_ORIGIN, c.env.ADMIN_ORIGIN];
  if (origin && !allowed.includes(origin))
    throw new HTTPException(403, { message: "origin_rejected" });
  if (
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    c.req.header("X-Mashrouak-Request") !== "1"
  )
    throw new HTTPException(403, { message: "request_header_required" });
  const length = Number(c.req.header("Content-Length") ?? 0);
  if (
    length >
    (c.req.path.startsWith("/api/media") ? 6 * 1024 * 1024 : 1024 * 1024)
  )
    throw new HTTPException(413, { message: "request_too_large" });
  await next();
};
