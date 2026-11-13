import { useSyncExternalStore } from 'react';
import {
  FEED_URL,
  fetchProjectFeed,
  normalizeFeed,
  type PortfolioProject,
} from './project-feed';

const projectId =
  import.meta.env.VITE_PORTFOLIO_FIREBASE_PROJECT_ID || 'portfolio-4b886';
const cacheKey = 'portfolio-live:v2:' + projectId + ':' + FEED_URL;
type State = {
  projects: PortfolioProject[];
  loading: boolean;
  error: boolean;
  stale: boolean;
};
const listeners = new Set<() => void>();
let state: State = { projects: [], loading: true, error: false, stale: false };
let generation = 0;
let stop: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout>;
let initialTimer: ReturnType<typeof setTimeout>;
let hasData = false;
try {
  const projects = normalizeFeed(
    JSON.parse(localStorage.getItem(cacheKey) || 'null'),
  );
  state = { projects, loading: false, error: false, stale: true };
  hasData = true;
} catch {
  /* No verified snapshot yet. */
}

function notify(next: State) {
  state = next;
  listeners.forEach((fn) => fn());
}
function accept(projects: PortfolioProject[], stale = false) {
  hasData = true;
  notify({ projects, loading: false, error: stale, stale });
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ version: 1, projects }));
  } catch {
    /* Optional cache. */
  }
}
async function connect() {
  const token = ++generation;
  clearTimeout(timer);
  stop?.();
  clearTimeout(initialTimer);
  let revision = 0;
  let readingFallback = false;
  const fallback = async () => {
    if (readingFallback) return;
    readingFallback = true;
    const started = revision;
    try {
      const projects = await fetchProjectFeed();
      if (token === generation && revision === started) accept(projects);
    } catch {
      if (token === generation && revision === started)
        notify({ ...state, loading: false, error: true, stale: hasData });
    } finally {
      readingFallback = false;
    }
  };
  initialTimer = setTimeout(fallback, 4000);
  const failed = async () => {
    clearTimeout(initialTimer);
    if (token !== generation) return;
    notify({ ...state, loading: !hasData, error: hasData, stale: hasData });
    await fallback();
    if (token === generation) timer = setTimeout(connect, 15000);
  };
  try {
    const [
      { initializeApp, getApps },
      { getFirestore, collection, onSnapshot, connectFirestoreEmulator },
    ] = await Promise.all([
      import('@firebase/app'),
      import('@firebase/firestore'),
    ]);
    if (token !== generation) return;
    const existing = getApps().find((app) => app.name === 'portfolio');
    const db = getFirestore(
      existing || initializeApp({ projectId }, 'portfolio'),
    );
    if (!existing && import.meta.env.DEV && projectId === 'demo-projects')
      connectFirestoreEmulator(db, '127.0.0.1', 8188);
    stop = onSnapshot(
      collection(db, 'publicProjects'),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (token !== generation) return;
        if (snapshot.metadata.fromCache && snapshot.empty) {
          if (hasData) notify({ ...state, stale: true, error: true });
          return;
        }
        try {
          const projects = normalizeFeed({
            version: 1,
            projects: snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            })),
          });
          if (!snapshot.metadata.fromCache) {
            revision++;
            clearTimeout(initialTimer);
          }
          accept(projects, snapshot.metadata.fromCache);
        } catch {
          notify({ ...state, loading: false, error: true, stale: hasData });
        }
      },
      failed,
    );
  } catch {
    await failed();
  }
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) void connect();
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      generation++;
      stop?.();
      stop = undefined;
      clearTimeout(timer);
      clearTimeout(initialTimer);
    }
  };
}
const current = () => state;
export function usePortfolioProjects() {
  return { ...useSyncExternalStore(subscribe, current), retry: connect };
}
