import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadEnv } from "vite";
const directory = resolve(process.argv[2] ?? "dist");
const html = await readFile(resolve(directory, "index.html"), "utf8");
const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc\s*=/.test(match[1]))
  .map(
    (match) =>
      `'sha256-${createHash("sha256").update(match[2]).digest("base64")}'`,
  );
const env = loadEnv("production", process.cwd(), "VITE_");
const origins = new Set();
for (const value of [
  process.env.VITE_API_URL ?? env.VITE_API_URL,
  process.env.VITE_CONTACT_API_URL ?? env.VITE_CONTACT_API_URL,
].filter(Boolean)) {
  const url = new URL(value);
  if (url.protocol !== "https:")
    throw new Error("Production API URLs must use HTTPS");
  origins.add(url.origin);
}
const api = [...origins].map((origin) => ` ${origin}`).join("");
const adminBuild=process.cwd().replaceAll('\\','/').endsWith('/admin-dashboard');
const csp = `default-src 'self'; script-src 'self' ${hashes.join(" ")}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self'${api}; object-src 'none'; base-uri 'self'; frame-ancestors ${adminBuild?"'self'":"'none'"}; form-action 'self'`;
await writeFile(
  resolve(directory, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: ${adminBuild?'SAMEORIGIN':'DENY'}\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${csp}\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
);
if (process.cwd().replaceAll("\\", "/").endsWith("/admin-dashboard"))
  await writeFile(
    resolve(directory, "robots.txt"),
    "User-agent: *\nDisallow: /\n",
  );
console.log("Generated security headers with hashes for the exact build.");
