import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPortfolioStore,
  firestoreFailure,
} from "../src/features/portfolio/portfolio-store";
import { normalizeFeed } from "../src/features/portfolio/project-feed";
import {
  ReadFailure,
  responseFailure,
  retryRead,
  transient,
} from "../src/lib/read-recovery";
import { startContentSync } from "../src/lib/content-sync";
import { api } from "../src/lib/platform-api";

const projects = (title = "Published") =>
  normalizeFeed({
    version: 1,
    projects: [{ id: "one", title, category: "web" }],
  });
function fixture(cached: ReturnType<typeof projects> | null = null) {
  let accept!: (data: ReturnType<typeof projects>, cached: boolean) => void;
  let fail!: (error: ReadFailure) => void;
  let recover!: (active: boolean) => void;
  let active = true;
  const stop = vi.fn(),
    save = vi.fn();
  const read = vi.fn(async (_signal: AbortSignal) => projects());
  const listen = vi.fn(async (next: typeof accept, error: typeof fail) => {
    accept = next;
    fail = error;
    return stop;
  });
  const store = createPortfolioStore({
    read,
    listen,
    save,
    load: () => cached,
    active: () => active,
    observe: (callback) => {
      recover = callback;
      return vi.fn();
    },
  });
  return {
    store,
    read,
    listen,
    stop,
    save,
    accept: (title: string, cached = false) => accept(projects(title), cached),
    fail: (code: string) => fail(firestoreFailure({ code })),
    recover: (available: boolean) => {
      active = available;
      recover(available);
    },
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("public read recovery", () => {
  it("preserves a proxy HTTP failure and Retry-After even when the response is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("temporarily unavailable", {
        status: 503,
        headers: { "Retry-After": "12" },
      }),
    );
    await expect(api("/public/content")).rejects.toMatchObject({
      kind: "http",
      status: 503,
      retryAfter: 12000,
    });
  });
  it("honors Retry-After and bounds a transient request burst at three attempts", async () => {
    vi.useFakeTimers();
    const read = vi
      .fn()
      .mockRejectedValue(
        responseFailure(
          new Response("", { status: 429, headers: { "Retry-After": "10" } }),
        ),
      );
    const request = retryRead(read, new AbortController().signal).catch(
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(9999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10001);
    expect(await request).toMatchObject({ status: 429 });
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("does not retry permission, invalid input, invalid data or caller cancellation", async () => {
    for (const error of [
      firestoreFailure({ code: "permission-denied" }),
      firestoreFailure({ code: "invalid-argument" }),
      new ReadFailure("invalid-data", "Malformed feed"),
      new DOMException("Cancelled", "AbortError"),
    ]) {
      const read = vi.fn().mockRejectedValue(error);
      await expect(retryRead(read, new AbortController().signal)).rejects.toBe(
        error,
      );
      expect(read).toHaveBeenCalledTimes(1);
    }
    expect(transient(firestoreFailure({ code: "unavailable" }))).toBe(true);
    expect(firestoreFailure({ code: "failed-precondition" }).kind).toBe(
      "configuration",
    );
  });
  it("cancels retry backoff without issuing another request", async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockRejectedValue(new TypeError("offline"));
    const controller = new AbortController();
    const request = retryRead(read, controller.signal).catch((error) => error);
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    expect(await request).toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(30000);
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("portfolio source coordination", () => {
  it("bounds terminal transient listener retries and restores an eligible subscription on recovery", async () => {
    vi.useFakeTimers();
    const setup = fixture(projects("Saved"));
    const end = setup.store.subscribe(vi.fn());
    await setup.store.retry();
    for (let attempt = 0; attempt < 3; attempt++) {
      setup.fail("unavailable");
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(setup.listen).toHaveBeenCalledTimes(3);
    expect(setup.store.current().projects).toEqual(projects());
    setup.recover(false);
    setup.recover(true);
    await setup.store.retry();
    expect(setup.listen).toHaveBeenCalledTimes(4);
    setup.accept("Restored live subscription");
    expect(setup.store.current()).toMatchObject({
      error: false,
      realtimeFailure: null,
      projects: projects("Restored live subscription"),
    });
    end();
    await vi.advanceTimersByTimeAsync(251);
  });
  it("shares requests and a listener across consumers and Strict Mode remounts", async () => {
    vi.useFakeTimers();
    const setup = fixture();
    const unsubscribe = setup.store.subscribe(vi.fn());
    unsubscribe();
    const next = setup.store.subscribe(vi.fn());
    await Promise.all([
      setup.store.retry(),
      setup.store.retry(),
      setup.store.retry(),
    ]);
    expect(setup.read).toHaveBeenCalledTimes(1);
    expect(setup.listen).toHaveBeenCalledTimes(1);
    next();
    await vi.advanceTimersByTimeAsync(251);
    expect(setup.stop).toHaveBeenCalledTimes(1);
  });
  it("keeps valid cache during revalidation and does not overwrite a live snapshot with a late feed or SDK cache", async () => {
    const setup = fixture(projects("Saved"));
    let resolve!: (data: ReturnType<typeof projects>) => void;
    setup.read.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const end = setup.store.subscribe(vi.fn());
    expect(setup.store.current()).toMatchObject({
      projects: projects("Saved"),
      error: false,
      stale: true,
    });
    setup.accept("Fresh live");
    setup.accept("Old SDK cache", true);
    resolve(projects("Old HTTP response"));
    await setup.store.retry();
    expect(setup.store.current().projects).toEqual(projects("Fresh live"));
    expect(setup.save).toHaveBeenLastCalledWith(projects("Fresh live"));
    end();
  });
  it("keeps the independent JSON feed working after permanent Firestore failures without resubscription storms", async () => {
    vi.useFakeTimers();
    for (const code of [
      "permission-denied",
      "invalid-argument",
      "failed-precondition",
    ]) {
      const setup = fixture();
      const end = setup.store.subscribe(vi.fn());
      await setup.store.retry();
      setup.fail(code);
      await vi.advanceTimersByTimeAsync(180000);
      setup.recover(false);
      setup.recover(true);
      await setup.store.retry();
      expect(setup.listen).toHaveBeenCalledTimes(1);
      expect(setup.store.current()).toMatchObject({
        error: false,
        projects: projects(),
      });
      expect(setup.store.current().realtimeFailure).toBeInstanceOf(ReadFailure);
      end();
      await vi.advanceTimersByTimeAsync(251);
    }
  });
  it("stops after a failed burst, preserves data, and automatically resumes on network restoration", async () => {
    vi.useFakeTimers();
    const setup = fixture(projects("Saved"));
    setup.read.mockRejectedValue(new TypeError("network changed"));
    const end = setup.store.subscribe(vi.fn());
    await vi.advanceTimersByTimeAsync(15000);
    expect(setup.read).toHaveBeenCalledTimes(3);
    expect(setup.store.current()).toMatchObject({
      error: true,
      stale: true,
      projects: projects("Saved"),
    });
    await vi.advanceTimersByTimeAsync(180000);
    expect(setup.read).toHaveBeenCalledTimes(3);
    setup.recover(false);
    setup.read.mockResolvedValue(projects("Recovered"));
    setup.recover(true);
    await setup.store.retry();
    expect(setup.store.current()).toMatchObject({
      error: false,
      stale: false,
      projects: projects("Recovered"),
    });
    end();
    await vi.advanceTimersByTimeAsync(251);
  });
  it("aborts obsolete HTTP work and ignores callbacks from before suspension", async () => {
    vi.useFakeTimers();
    const setup = fixture(projects("Saved"));
    let oldSignal!: AbortSignal,
      resolve!: (data: ReturnType<typeof projects>) => void;
    setup.read.mockImplementationOnce((signal) => {
      oldSignal = signal;
      return new Promise((done) => {
        resolve = done;
      });
    });
    const end = setup.store.subscribe(vi.fn());
    await vi.advanceTimersByTimeAsync(1);
    setup.recover(false);
    setup.accept("Obsolete listener");
    expect(oldSignal.aborted).toBe(true);
    setup.read.mockResolvedValue(projects("Restored"));
    setup.recover(true);
    await setup.store.retry();
    resolve(projects("Obsolete HTTP"));
    await vi.advanceTimersByTimeAsync(1);
    expect(setup.store.current().projects).toEqual(projects("Restored"));
    end();
    await vi.advanceTimersByTimeAsync(251);
  });
  it("accepts an authoritative deletion instead of resurrecting removed projects from cache", async () => {
    const setup = fixture(projects("Saved"));
    const end = setup.store.subscribe(vi.fn());
    await setup.store.retry();
    setup.read.mockResolvedValue([]);
    setup.recover(false);
    setup.recover(true);
    await new Promise((done) => setTimeout(done, 1001));
    await setup.store.retry();
    expect(setup.store.current().projects).toEqual([]);
    end();
  });
  it("does not replace healthy live data with an older CDN snapshot, or poll a redundant source", async () => {
    vi.useFakeTimers();
    const setup = fixture();
    const end = setup.store.subscribe(vi.fn());
    await setup.store.retry();
    setup.accept("New live publication");
    setup.read.mockResolvedValue(projects("Old edge copy"));
    await vi.advanceTimersByTimeAsync(180000);
    await setup.store.retry();
    expect(setup.read).toHaveBeenCalledTimes(1);
    expect(setup.store.current().projects).toEqual(
      projects("New live publication"),
    );
    setup.accept("Old SDK cache", true);
    await setup.store.retry();
    expect(setup.read).toHaveBeenCalledTimes(2);
    end();
    await vi.advanceTimersByTimeAsync(251);
  });
});

class Stream extends EventTarget {
  static instances: Stream[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = 2;
  });
  constructor() {
    super();
    Stream.instances.push(this);
  }
}
function cmsFixture() {
  vi.useFakeTimers();
  Stream.instances = [];
  const window = new EventTarget(),
    document = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("EventSource", Stream);
  const fetcher = vi.fn(async () => Response.json({ revision: 1 }));
  vi.stubGlobal("fetch", fetcher);
  const refresh = vi.fn(async () => {}),
    notice = vi.fn();
  const stop = startContentSync({
    eventsUrl: "/events",
    revisionUrl: "/revision",
    refresh,
    notice,
    currentRevision: () => 1,
  });
  return { window, document, fetcher, refresh, notice, stop };
}
describe("CMS publication synchronization", () => {
  it("bounds reconnects even when a proxy opens a stream and immediately closes it", async () => {
    const setup = cmsFixture();
    for (let attempt = 0; attempt < 3; attempt++) {
      const stream = Stream.instances.at(-1)!;
      stream.readyState = 1;
      stream.onopen!();
      stream.readyState = 0;
      stream.onerror!();
      await vi.advanceTimersByTimeAsync(5000);
    }
    await vi.advanceTimersByTimeAsync(90000);
    expect(Stream.instances).toHaveLength(3);
    setup.stop();
  });
  it("uses a single stream with a 60 second healthy watchdog instead of two second polling", async () => {
    const setup = cmsFixture();
    Stream.instances[0]!.readyState = 1;
    Stream.instances[0]!.onopen!();
    await vi.advanceTimersByTimeAsync(59000);
    expect(setup.fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1001);
    expect(setup.fetcher).toHaveBeenCalledTimes(2);
    expect(Stream.instances).toHaveLength(1);
    setup.stop();
  });
  it("coalesces focus/online/visible signals, closes suspended streams, and cleans up", async () => {
    const setup = cmsFixture();
    await vi.advanceTimersByTimeAsync(1001);
    setup.document.hidden = true;
    setup.document.dispatchEvent(new Event("visibilitychange"));
    expect(Stream.instances[0]!.close).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);
    expect(setup.fetcher).toHaveBeenCalledTimes(1);
    setup.document.hidden = false;
    setup.document.dispatchEvent(new Event("visibilitychange"));
    setup.window.dispatchEvent(new Event("online"));
    setup.window.dispatchEvent(new Event("focus"));
    setup.window.dispatchEvent(new Event("pageshow"));
    await vi.advanceTimersByTimeAsync(151);
    expect(Stream.instances).toHaveLength(2);
    expect(setup.fetcher).toHaveBeenCalledTimes(2);
    setup.stop();
    await vi.advanceTimersByTimeAsync(120000);
    expect(setup.fetcher).toHaveBeenCalledTimes(2);
  });
  it("stops failed revision polling after bounded retries until a recovery event", async () => {
    const setup = cmsFixture();
    await vi.advanceTimersByTimeAsync(1);
    setup.fetcher.mockRejectedValue(new TypeError("offline"));
    await vi.advanceTimersByTimeAsync(90000);
    expect(setup.fetcher).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(90000);
    expect(setup.fetcher).toHaveBeenCalledTimes(4);
    setup.fetcher.mockResolvedValue(Response.json({ revision: 2 }));
    setup.window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(151);
    expect(setup.notice).toHaveBeenLastCalledWith(2);
    expect(setup.fetcher).toHaveBeenCalledTimes(5);
    setup.stop();
  });
  it("falls back from a closed stream without rebuilding it indefinitely", async () => {
    const setup = cmsFixture();
    const stream = Stream.instances[0]!;
    stream.readyState = 2;
    stream.onerror!();
    await vi.advanceTimersByTimeAsync(45001);
    expect(Stream.instances).toHaveLength(1);
    expect(setup.fetcher.mock.calls.length).toBe(4);
    setup.stop();
  });
});
