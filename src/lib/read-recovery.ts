export class ReadFailure extends Error {
  constructor(
    public kind:
      "transport" | "http" | "invalid-data" | "permission" | "configuration",
    message: string,
    public status = 0,
    public retryAfter = 0,
  ) {
    super(message);
  }
}

export function retryDelay(attempt: number, retryAfter = 0) {
  return Math.max(
    retryAfter,
    Math.min(8000, 750 * 2 ** attempt) * (0.75 + Math.random() * 0.5),
  );
}

export function transient(error: unknown) {
  if (error instanceof ReadFailure)
    return (
      error.kind === "transport" ||
      (error.kind === "http" &&
        [408, 429, 500, 502, 503, 504].includes(error.status))
    );
  if (error instanceof DOMException) return error.name === "TimeoutError";
  return error instanceof TypeError;
}

export function responseFailure(response: Response) {
  const value = response.headers.get("Retry-After");
  const delay = value
    ? /^\d+$/.test(value)
      ? Number(value) * 1000
      : Math.max(0, Date.parse(value) - Date.now())
    : 0;
  return new ReadFailure(
    "http",
    `Read returned HTTP ${response.status}`,
    response.status,
    Number.isFinite(delay) ? delay : 0,
  );
}

export function waitForRetry(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delay);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function retryRead<T>(
  read: () => Promise<T>,
  signal: AbortSignal,
) {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      return await read();
    } catch (error) {
      if (signal.aborted || !transient(error) || attempt === 2) throw error;
      await waitForRetry(
        retryDelay(
          attempt,
          error instanceof ReadFailure ? error.retryAfter : 0,
        ),
        signal,
      );
    }
  }
}

type RecoveryListener = (active: boolean) => void;
const listeners = new Set<RecoveryListener>();
let cleanup: (() => void) | undefined;
export const networkActive = () =>
  !document.hidden && navigator.onLine !== false;

export function observeRecovery(listener: RecoveryListener) {
  listeners.add(listener);
  if (!cleanup) {
    const connection = (navigator as Navigator & { connection?: EventTarget })
      .connection;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const emit = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => listeners.forEach((fn) => fn(networkActive())),
        150,
      );
    };
    const pause = () => {
      clearTimeout(timer);
      listeners.forEach((fn) => fn(false));
    };
    const visibility = () => (document.hidden ? pause() : emit());
    window.addEventListener("online", emit);
    window.addEventListener("offline", pause);
    window.addEventListener("focus", emit);
    window.addEventListener("pageshow", emit);
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("freeze", pause);
    document.addEventListener("resume", emit);
    connection?.addEventListener("change", emit);
    cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("online", emit);
      window.removeEventListener("offline", pause);
      window.removeEventListener("focus", emit);
      window.removeEventListener("pageshow", emit);
      window.removeEventListener("pagehide", pause);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("freeze", pause);
      document.removeEventListener("resume", emit);
      connection?.removeEventListener("change", emit);
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      cleanup?.();
      cleanup = undefined;
    }
  };
}
