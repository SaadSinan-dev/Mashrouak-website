import { describe, it, expect, vi } from "vitest";
import { createResourceCache } from "../shared/resource-cache";
import { api } from "../src/lib/platform-api";
describe("coordinated resources", () => {
  it("keeps the latest publication when a pre-publication response finishes last", async () => {
    const resolve: ((value: unknown) => void)[] = [];
    const cache = createResourceCache(() => new Promise((done) => resolve.push(done)));
    const first = cache.refresh("/public/content");
    const second = cache.invalidate("/public/content");
    const third = cache.invalidate("/public/content");
    resolve[2]!({ revision: 3, heading: "Third publication" });
    await third;
    resolve[1]!({ revision: 2, heading: "Second publication" });
    resolve[0]!({ revision: 1, heading: "First publication" });
    await Promise.all([first, second]);
    expect(cache.peek("/public/content").data).toEqual({ revision: 3, heading: "Third publication" });
    expect(cache.peek("/public/content").pending).toBe(false);
  });
  it("rejects an HTML SPA fallback instead of treating it as a successful API response", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<!doctype html><html></html>", {status:200,headers:{"Content-Type":"text/html"}}));
    try { await expect(api("/public/content")).rejects.toMatchObject({code:"invalid_api_response"}); }
    finally { fetch.mockRestore(); }
  });
  it("coalesces route prefetch and mounted consumers into one request", async () => {
    let finish!: (value: unknown) => void;
    const fetch = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    const cache = createResourceCache(fetch);
    cache.preload("/content");
    cache.preload("/content");
    const waiting = cache.refresh("/content");
    expect(fetch).toHaveBeenCalledTimes(1);
    finish({ entries: [] });
    await waiting;
    expect(cache.peek("/content").data).toEqual({ entries: [] });
    expect(cache.peek("/content").pending).toBe(false);
  });
  it("keeps successful content during refresh and after a refresh failure", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockRejectedValueOnce(new Error("offline"));
    const cache = createResourceCache(fetch);
    await cache.refresh("/overview");
    const refreshing = cache.refresh("/overview");
    expect(cache.peek("/overview").data).toEqual({ value: 1 });
    await refreshing;
    expect(cache.peek("/overview").data).toEqual({ value: 1 });
    expect(cache.peek("/overview").error).toBeInstanceOf(Error);
    expect(cache.peek("/overview").pending).toBe(false);
  });
  it("ignores stale private responses after session clearing", async () => {
    let finish!: (value: unknown) => void;
    const cache = createResourceCache(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const waiting = cache.refresh("/private");
    cache.clear();
    finish({ secret: "old account" });
    await waiting;
    expect(cache.peek("/private").data).toBe(null);
  });
  it("settles initial failures and permits a real retry", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ items: [] });
    const cache = createResourceCache(fetch);
    await cache.refresh("/table");
    expect(cache.peek("/table").pending).toBe(false);
    expect(cache.peek("/table").data).toBe(null);
    await cache.refresh("/table");
    expect(cache.peek("/table").data).toEqual({ items: [] });
  });
  it("keeps the deadline when a caller supplies an abort signal", async () => {
    const caller = new AbortController(),
      deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(deadline.signal);
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Deadline", "AbortError")),
          );
        }),
    );
    try {
      const request = api("/deadline", { signal: caller.signal });
      deadline.abort();
      await expect(request).rejects.toMatchObject({ name: "AbortError" });
      expect(caller.signal.aborted).toBe(false);
    } finally {
      timeout.mockRestore();
      fetch.mockRestore();
    }
  });
});
