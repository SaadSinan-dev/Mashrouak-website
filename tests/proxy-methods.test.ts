import { describe, it, expect, vi } from "vitest";
import { onRequest } from "../functions/api/[[path]]";
const env = {
  API_PROXY_URL: "https://trusted.example",
  PAGES_PROXY_SECRET: "qa-only-secret-at-least-32-characters",
};
describe("Pages proxy methods and failure boundaries", () => {
  for (const method of [
    "GET",
    "HEAD",
    "OPTIONS",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ])
    it(method + " preserves method, query and request body", async () => {
      const mock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(null, {
            status: 204,
            headers: {
              "set-cookie":
                "test=value; HttpOnly; Secure; SameSite=Strict; Path=/api",
            },
          }),
        );
      const body = ["GET", "HEAD"].includes(method)
        ? undefined
        : '{"safe":true}';
      const request = new Request(
        "https://pages.example/api/admin/content?q=one%20two",
        {
          method,
          body,
          headers: { Origin: "https://pages.example", Cookie: "test=value" },
        },
      );
      const response = await onRequest({ request, env });
      expect(response.status).toBe(204);
      const [target, init] = mock.mock.calls[0]!;
      expect(String(target)).toBe(
        "https://trusted.example/api/admin/content?q=one%20two",
      );
      expect(init?.method).toBe(method);
      if (body) expect(await new Response(init!.body).text()).toBe(body);
      expect(new Headers(init?.headers).get("cookie")).toBe("test=value");
      expect(response.headers.get("set-cookie")).toContain("Secure");
    });
  it("returns JSON 502 on upstream failure instead of HTML success", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("private upstream detail"),
    );
    const response = await onRequest({
      request: new Request("https://pages.example/api/test"),
      env,
    });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private upstream detail");
  });
  it("cannot proxy arbitrary paths", async () => {
    const mock = vi.spyOn(globalThis, "fetch");
    expect(
      (
        await onRequest({
          request: new Request("https://pages.example/other"),
          env,
        })
      ).status,
    ).toBe(404);
    expect(mock).not.toHaveBeenCalled();
  });
});
