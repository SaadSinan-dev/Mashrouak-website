export type ScenePhase =
  "loading" | "rendering" | "ready" | "error" | "fallback";
export type SceneStatus = { phase: ScenePhase; reason?: string };

/** Every acquired resource has a teardown even if initialization stops halfway. */
export class SceneResources {
  private releases: (() => void)[] = [];
  disposed = false;

  add(release: () => void) {
    let released = false;
    const once = () => {
      if (released) return;
      released = true;
      release();
    };
    if (this.disposed) once();
    else this.releases.push(once);
    return once;
  }

  own<T extends { dispose: () => void }>(resource: T): T {
    this.add(() => resource.dispose());
    return resource;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const release of this.releases.reverse()) {
      try {
        release();
      } catch {
        // Continue releasing independent GPU resources after a lost context.
      }
    }
    this.releases = [];
  }
}

/** A single bottom-to-top reveal of the existing geometry, never generated edges. */
export function advanceSceneReveal(progress: number, elapsedSeconds: number) {
  return Math.min(1, progress + Math.max(0, elapsedSeconds) / 0.7);
}

export function revealHeight(progress: number, bottom: number, top: number) {
  const eased = progress * progress * (3 - 2 * progress);
  return bottom + (top - bottom) * eased;
}

export function loadSceneImage(url: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const finish = (error?: unknown) => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
      if (error) {
        image.src = "";
        reject(error);
      } else resolve(image);
    };
    const abort = () =>
      finish(signal.reason ?? new Error("scene_load_aborted"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish();
    image.onerror = () => finish(new Error("brand_asset_unavailable"));
    image.src = url;
  });
}
