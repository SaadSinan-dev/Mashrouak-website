import { useSyncExternalStore } from "react";
import { FEED_URL, fetchProjectFeed, normalizeFeed } from "./project-feed";
import { createPortfolioStore, firestoreFailure } from "./portfolio-store";
import {
  networkActive,
  observeRecovery,
  ReadFailure,
} from "../../lib/read-recovery";

const projectId =
  import.meta.env.VITE_PORTFOLIO_FIREBASE_PROJECT_ID || "portfolio-4b886";
const cacheKey = "portfolio-live:v2:" + projectId + ":" + FEED_URL;
const store = createPortfolioStore({
  read: fetchProjectFeed,
  active: networkActive,
  observe: observeRecovery,
  load() {
    try {
      return normalizeFeed(
        JSON.parse(localStorage.getItem(cacheKey) || "null"),
      );
    } catch {
      return null;
    }
  },
  save(projects) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ version: 1, projects }));
    } catch {}
  },
  async listen(accept, fail) {
    const [
      { initializeApp, getApps },
      { getFirestore, collection, onSnapshot, connectFirestoreEmulator },
    ] = await Promise.all([
      import("@firebase/app"),
      import("@firebase/firestore"),
    ]);
    const existing = getApps().find((app) => app.name === "portfolio");
    const db = getFirestore(
      existing || initializeApp({ projectId }, "portfolio"),
    );
    if (!existing && import.meta.env.DEV && projectId === "demo-projects")
      connectFirestoreEmulator(db, "127.0.0.1", 8188);
    return onSnapshot(
      collection(db, "publicProjects"),
      { includeMetadataChanges: true },
      (snapshot) => {
        try {
          accept(
            normalizeFeed({
              version: 1,
              projects: snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
              })),
            }),
            snapshot.metadata.fromCache,
          );
        } catch {
          fail(
            new ReadFailure(
              "invalid-data",
              "Invalid Firestore public project snapshot",
            ),
          );
        }
      },
      (error) => fail(firestoreFailure(error)),
    );
  },
});

export function peekPortfolioProject(id?: string) {
  return store.current().projects.find((project) => project.id === id);
}
export function usePortfolioProjects() {
  return {
    ...useSyncExternalStore(store.subscribe, store.current),
    retry: store.retry,
  };
}
