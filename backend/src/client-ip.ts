import { isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";
export function clientIp(
  request: Request,
  socket: string,
  production: boolean,
  proxySecret?: string,
) {
  if (!production) return socket;
  const provided = request.headers.get("X-Mashrouak-Proxy-Key") ?? "",
    forwarded = request.headers.get("X-Mashrouak-Client-IP") ?? "";
  const received = Buffer.from(provided),
    expected = Buffer.from(proxySecret ?? "");
  if (
    proxySecret &&
    proxySecret.length >= 32 &&
    received.length === expected.length &&
    timingSafeEqual(received, expected) &&
    isIP(forwarded)
  )
    return forwarded;
  // Render appends the direct client's address at its trusted ingress.
  const direct = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(-1)
    ?.trim();
  return direct && isIP(direct) ? direct : socket;
}
