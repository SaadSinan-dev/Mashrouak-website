import {
  networkActive,
  observeRecovery,
  responseFailure,
  retryDelay,
  retryRead,
  ReadFailure,
} from "./read-recovery";

export function startContentSync(options: {
  eventsUrl: string;
  revisionUrl: string;
  refresh: () => Promise<void>;
  currentRevision: () => number;
  notice: (revision: number) => void;
}) {
  let active = true,
    source: EventSource | undefined,
    checking: Promise<void> | undefined;
  let controller: AbortController | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    reconnect: ReturnType<typeof setTimeout> | undefined;
  let etag = "",
    streamAttempts = 0,
    lastCheck = 0,
    lastRecovery = 0;
  const schedule = () => {
    clearTimeout(timer);
    if (active && networkActive())
      timer = setTimeout(
        () => {
          void check();
        },
        source?.readyState === 1 ? 60000 : 15000,
      );
  };
  const notice = (revision: unknown) => {
    if (
      typeof revision !== "number" ||
      !Number.isSafeInteger(revision) ||
      revision < 0
    )
      throw new ReadFailure("invalid-data", "Invalid content revision");
    options.notice(revision);
    if (revision > options.currentRevision()) void options.refresh();
  };
  function check() {
    if (checking) return checking;
    if (!active || !networkActive()) return Promise.resolve();
    const request = new AbortController();
    controller = request;
    const pending = retryRead(async () => {
      const response = await fetch(options.revisionUrl, {
        credentials: "include",
        cache: "no-store",
        headers: etag ? { "If-None-Match": etag } : {},
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      });
      if (request.signal.aborted) return;
      if (response.status === 304) return;
      if (!response.ok) throw responseFailure(response);
      const body = await response.json().catch(() => {
        throw new ReadFailure(
          "invalid-data",
          "Invalid content revision response",
        );
      });
      if (!active || request.signal.aborted) return;
      notice(body.revision);
      etag = response.headers.get("ETag") ?? "";
    }, request.signal)
      .then(() => {
        if (!request.signal.aborted) {
          lastCheck = Date.now();
          schedule();
        }
      })
      .catch(() => {
        if (checking === pending && !request.signal.aborted)
          clearTimeout(timer);
      })
      .finally(() => {
        if (checking === pending) checking = undefined;
      });
    checking = pending;
    return pending;
  }
  function connect() {
    if (
      !active ||
      !networkActive() ||
      source ||
      streamAttempts >= 3 ||
      typeof EventSource === "undefined"
    )
      return;
    const stream = new EventSource(options.eventsUrl, {
      withCredentials: true,
    });
    streamAttempts++;
    source = stream;
    stream.onopen = () => {
      schedule();
    };
    stream.addEventListener("publication", (event) => {
      if (source !== stream || !active) return;
      try {
        notice(JSON.parse((event as MessageEvent<string>).data).revision);
      } catch {
        void check();
      }
    });
    stream.onerror = () => {
      if (source !== stream) return;
      const closed = stream.readyState === 2;
      stream.close();
      source = undefined;
      if (!closed && streamAttempts < 3)
        reconnect = setTimeout(connect, retryDelay(streamAttempts));
      else streamAttempts = 3;
      schedule();
    };
  }
  function pause() {
    lastRecovery = 0;
    clearTimeout(timer);
    clearTimeout(reconnect);
    source?.close();
    source = undefined;
    controller?.abort();
    checking = undefined;
  }
  function recover(available: boolean) {
    if (!available) {
      pause();
      return;
    }
    if (Date.now() - lastRecovery < 1000) return;
    lastRecovery = Date.now();
    streamAttempts = 0;
    connect();
    if (Date.now() - lastCheck >= 1000) {
      void options.refresh();
      void check();
    }
  }
  const unsubscribe = observeRecovery(recover);
  recover(networkActive());
  return () => {
    active = false;
    pause();
    unsubscribe();
  };
}
