import { ReadFailure, responseFailure } from "./read-recovery";

export const apiOrigin = (import.meta.env.VITE_API_URL ?? "").replace(
  /\/$/,
  "",
);
export function mediaUrl(url: string) {
  return url.startsWith("/api/") ? `${apiOrigin}${url}` : url;
}
export class ApiError extends ReadFailure {
  constructor(
    public code: string,
    status: number,
    retryAfter = 0,
  ) {
    super(
      code === "invalid_api_response" ? "invalid-data" : "http",
      code,
      status,
      retryAfter,
    );
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiOrigin}/api${path}`, {
    ...options,
    credentials: "include",
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(90000)])
      : AbortSignal.timeout(90000),
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      "X-Mashrouak-Request": "1",
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("mashrouak:unauthorized"));
    throw new ApiError(
      body?.error ?? "network_error",
      response.status,
      responseFailure(response).retryAfter,
    );
  }
  if (!body || typeof body !== "object")
    throw new ApiError("invalid_api_response", 502);
  return body as T;
}
