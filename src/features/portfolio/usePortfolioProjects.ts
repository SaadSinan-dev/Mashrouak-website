import { useCallback, useEffect, useState } from 'react';
import { FEED_URL, REFRESH_MS, fetchProjectFeed, normalizeFeed, type PortfolioProject } from './project-feed';

const key = `mashrouak:portfolio-projects:v1:${FEED_URL}`;
type State = { projects: PortfolioProject[]; loading: boolean; error: boolean; stale: boolean; fetchedAt: number; hasData: boolean };
function savedState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Number.isFinite(saved.fetchedAt)) return { projects: normalizeFeed(saved.feed), loading: false, error: false, stale: false, fetchedAt: saved.fetchedAt, hasData: true };
  } catch { /* Ignore invalid or blocked storage. */ }
  return { projects: [], loading: true, error: false, stale: false, fetchedAt: 0, hasData: false };
}

export function usePortfolioProjects() {
  const [state, setState] = useState<State>(savedState);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async (force = false) => {
      if (pending || (!force && Date.now() - state.fetchedAt < REFRESH_MS)) return;
      pending = true;
      try {
        const projects = await fetchProjectFeed();
        if (!active) return;
        const fetchedAt = Date.now();
        setState({ projects, loading: false, error: false, stale: false, fetchedAt, hasData: true });
        try { localStorage.setItem(key, JSON.stringify({ fetchedAt, feed: { version: 1, projects } })); } catch { /* Storage is optional. */ }
      } catch {
        if (active) setState((current) => ({ ...current, loading: false, error: true, stale: current.hasData }));
      } finally { pending = false; }
    };
    void refresh(attempt > 0);
    const timer = window.setInterval(() => { void refresh(); }, REFRESH_MS);
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [attempt, state.fetchedAt]);
  return { ...state, retry };
}
