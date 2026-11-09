import { useSyncExternalStore, type ComponentType } from "react";
export function withModuleDeadline<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    request,
    new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("module_load_timeout")), 30000);
    }),
  ]).finally(() => clearTimeout(timer));
}
export function createModule<P extends object = Record<string, never>>(
  loader: () => Promise<ComponentType<P>>,
) {
  let Component: ComponentType<P> | null = null;
  let error: unknown = null;
  let promise: Promise<void> | null = null;
  let revision = 0;
  const listeners = new Set<() => void>();
  function start() {
    if (promise || Component || error) return;
    promise = withModuleDeadline(loader())
      .then((value) => {
        Component = value;
      })
      .catch((reason) => {
        error = reason;
      })
      .finally(() => {
        promise = null;
        revision++;
        listeners.forEach((fn) => fn());
      });
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  function useModule() {
    start();
    useSyncExternalStore(
      subscribe,
      () => revision,
      () => revision,
    );
    return {
      Component,
      error,
      pending: !Component && !error,
      retry: () => {
        error = null;
        revision++;
        start();
        listeners.forEach((fn) => fn());
      },
    };
  }
  return { useModule };
}
