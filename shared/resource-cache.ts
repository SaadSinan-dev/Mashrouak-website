import { useEffect, useSyncExternalStore } from "react";
export function createResourceCache(
  fetcher: (path: string, options: RequestInit) => Promise<unknown>,
) {
  type Snapshot = {
    data: unknown;
    error: unknown;
    pending: boolean;
    updatedAt: number;
  };
  type Record = {
    snapshot: Snapshot;
    listeners: Set<() => void>;
    promise: Promise<void> | null;
    controller: AbortController | null;
    active: boolean;
    generation: number;
  };
  const records = new Map<string, Record>();
  const idle: Snapshot = {
    data: null,
    error: null,
    pending: false,
    updatedAt: 0,
  };
  function get(path: string) {
    let record = records.get(path);
    if (!record) {
      record = {
        snapshot: { ...idle, pending: true },
        listeners: new Set(),
        promise: null,
        controller: null,
        active: true,
        generation: 0,
      };
      records.set(path, record);
    }
    return record;
  }
  function refresh(path: string, invalidate = false): Promise<void> {
    const record = get(path);
    if (record.promise && !invalidate) return record.promise;
    if (invalidate) record.controller?.abort();
    const generation = ++record.generation;
    record.controller = new AbortController();
    record.snapshot = { ...record.snapshot, pending: true, error: null };
    record.listeners.forEach((fn) => fn());
    const controller = record.controller;
    record.promise = fetcher(path, { signal: controller.signal })
      .then((data) => {
        if (
          record.active &&
          generation === record.generation &&
          !controller.signal.aborted
        )
          record.snapshot = {
            data,
            error: null,
            pending: false,
            updatedAt: Date.now(),
          };
      })
      .catch((error) => {
        if (
          record.active &&
          generation === record.generation &&
          !controller.signal.aborted
        )
          record.snapshot = { ...record.snapshot, error, pending: false };
      })
      .finally(() => {
        if (generation === record.generation) {
          record.promise = null;
          if (record.active) record.listeners.forEach((fn) => fn());
        }
      });
    return record.promise;
  }
  function preload(path: string | null) {
    if (!path) return;
    const record = get(path);
    if (!record.promise && !record.snapshot.updatedAt && !record.snapshot.error)
      void refresh(path);
  }
  function useResource<T>(path: string | null, poll = 0) {
    if (path) preload(path);
    const record = path ? get(path) : null;
    const snapshot = useSyncExternalStore(
      (listener) => {
        record?.listeners.add(listener);
        return () => {
          record?.listeners.delete(listener);
        };
      },
      () => record?.snapshot ?? idle,
      () => idle,
    );
    useEffect(() => {
      if (!path) return;
      if (
        record?.snapshot.updatedAt &&
        Date.now() - record.snapshot.updatedAt > 30000
      )
        void refresh(path);
      const timer = poll
        ? window.setInterval(() => {
            if (!document.hidden) void refresh(path);
          }, poll)
        : undefined;
      return () => clearInterval(timer);
    }, [path, poll, record]);
    return {
      data: snapshot.data as T | null,
      error: snapshot.error,
      loading: !snapshot.data && snapshot.pending,
      refreshing: !!snapshot.data && snapshot.pending,
      reload: () => (path ? refresh(path) : Promise.resolve()),
      retry: () => {
        if (path) void refresh(path);
      },
    };
  }
  function clear() {
    for (const record of records.values()) {
      record.active = false;
      record.controller?.abort();
    }
    records.clear();
  }
  return {
    preload,
    useResource,
    refresh,
    invalidate: (path: string) => refresh(path, true),
    clear,
    peek: (path: string) => get(path).snapshot,
  };
}
