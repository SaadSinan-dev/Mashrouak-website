import type { PortfolioProject } from "./project-feed";
import {
  ReadFailure,
  retryDelay,
  retryRead,
  transient,
} from "../../lib/read-recovery";

export function firestoreFailure(error: { code?: string; message?: string }) {
  const code = error.code?.replace("firestore/", "") ?? "unknown";
  const kind = ["permission-denied", "unauthenticated"].includes(code)
    ? "permission"
    : [
          "invalid-argument",
          "failed-precondition",
          "not-found",
          "unimplemented",
        ].includes(code)
      ? "configuration"
      : [
            "unavailable",
            "deadline-exceeded",
            "aborted",
            "resource-exhausted",
            "internal",
          ].includes(code)
        ? "transport"
        : "configuration";
  return new ReadFailure(kind, `Firestore ${code}: ${error.message ?? ""}`);
}

type State = {
  projects: PortfolioProject[];
  loading: boolean;
  error: boolean;
  stale: boolean;
  failure: unknown;
  realtimeFailure: unknown;
};
type Dependencies = {
  read: (signal: AbortSignal) => Promise<PortfolioProject[]>;
  listen: (
    accept: (projects: PortfolioProject[], cached: boolean) => void,
    fail: (error: ReadFailure) => void,
  ) => Promise<() => void>;
  load: () => PortfolioProject[] | null;
  save: (projects: PortfolioProject[]) => void;
  active: () => boolean;
  observe: (listener: (active: boolean) => void) => () => void;
};

export function createPortfolioStore(deps: Dependencies) {
  const cached = deps.load();
  let state: State = {
    projects: cached ?? [],
    loading: !cached,
    error: false,
    stale: !!cached,
    failure: null,
    realtimeFailure: null,
  };
  let hasData = cached !== null,
    running = false,
    generation = 0,
    revision = 0;
  let stopLive: (() => void) | undefined,
    stopRecovery: (() => void) | undefined;
  let controller: AbortController | undefined,
    flight: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined,
    reconnect: ReturnType<typeof setTimeout> | undefined,
    disposal: ReturnType<typeof setTimeout> | undefined;
  let liveAttempt = 0,
    livePending = false,
    permanentLiveFailure = false,
    liveFresh = false,
    lastRead = 0;
  const listeners = new Set<() => void>();
  const notify = (next: State) => {
    state = next;
    listeners.forEach((fn) => fn());
  };
  const accept = (projects: PortfolioProject[], stale = false) => {
    hasData = true;
    notify({
      ...state,
      projects,
      loading: false,
      error: false,
      stale,
      failure: null,
    });
    if (!stale) deps.save(projects);
    if (running && deps.active() && !flight && !stale && !liveFresh) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 60000);
    }
  };
  function refresh() {
    if (!running || !deps.active()) return Promise.resolve();
    if (flight) return flight;
    if (liveFresh) return Promise.resolve();
    if (Date.now() - lastRead < 1000 && !state.error) return Promise.resolve();
    clearTimeout(timer);
    const token = generation,
      started = revision;
    const request = new AbortController();
    controller = request;
    const pending = retryRead(() => deps.read(request.signal), request.signal)
      .then((projects) => {
        if (
          running &&
          generation === token &&
          revision === started &&
          !request.signal.aborted &&
          !liveFresh
        ) {
          lastRead = Date.now();
          accept(projects);
        }
      })
      .catch((error) => {
        if (
          running &&
          generation === token &&
          revision === started &&
          !request.signal.aborted &&
          !liveFresh
        )
          notify({
            ...state,
            loading: false,
            error: true,
            stale: hasData,
            failure: error,
          });
      })
      .finally(() => {
        if (flight !== pending) return;
        flight = undefined;
        if (running && deps.active() && !state.error && !liveFresh)
          timer = setTimeout(() => {
            void refresh();
          }, 60000);
      });
    flight = pending;
    return pending;
  }
  async function connect() {
    if (
      !running ||
      !deps.active() ||
      stopLive ||
      livePending ||
      permanentLiveFailure ||
      liveAttempt >= 3
    )
      return;
    livePending = true;
    const token = generation;
    let failed = false;
    const fail = (error: ReadFailure) => {
      if (!running || generation !== token || failed) return;
      failed = true;
      liveFresh = false;
      stopLive?.();
      stopLive = undefined;
      permanentLiveFailure = !transient(error);
      notify({ ...state, realtimeFailure: error });
      void refresh();
      if (!permanentLiveFailure && ++liveAttempt < 3)
        reconnect = setTimeout(() => {
          void connect();
        }, retryDelay(liveAttempt));
    };
    try {
      const unsubscribe = await deps.listen((projects, fromCache) => {
        if (!running || generation !== token || failed) return;
        if (fromCache) {
          const wasFresh = liveFresh;
          liveFresh = false;
          if (!hasData && projects.length) accept(projects, true);
          if (wasFresh) {
            lastRead = 0;
            void refresh();
          }
          return;
        }
        revision++;
        lastRead = Date.now();
        liveFresh = true;
        clearTimeout(timer);
        state = { ...state, realtimeFailure: null };
        accept(projects);
      }, fail);
      if (!running || generation !== token || failed) unsubscribe();
      else stopLive = unsubscribe;
    } catch (error) {
      fail(
        error instanceof ReadFailure
          ? error
          : new ReadFailure("configuration", String(error)),
      );
    } finally {
      if (generation === token) livePending = false;
    }
  }
  function pause(markStale = true) {
    generation++;
    liveFresh = false;
    if (markStale) lastRead = 0;
    clearTimeout(timer);
    clearTimeout(reconnect);
    stopLive?.();
    stopLive = undefined;
    livePending = false;
    controller?.abort();
    flight = undefined;
    if (hasData && markStale) notify({ ...state, stale: true });
  }
  function recover(active: boolean) {
    if (!active) {
      pause();
      return;
    }
    liveAttempt = 0;
    void connect();
    void refresh();
  }
  return {
    current: () => state,
    retry: () => {
      liveAttempt = 0;
      void connect();
      return refresh();
    },
    subscribe(listener: () => void) {
      clearTimeout(disposal);
      listeners.add(listener);
      if (!running) {
        running = true;
        stopRecovery = deps.observe(recover);
        void connect();
        if (!hasData || state.stale || Date.now() - lastRead >= 60000)
          void refresh();
        else
          timer = setTimeout(() => {
            void refresh();
          }, 60000);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size)
          disposal = setTimeout(() => {
            if (!listeners.size) {
              running = false;
              pause(false);
              stopRecovery?.();
            }
          }, 250);
      };
    },
  };
}
