import { useCallback, useEffect, type ReactNode } from "react";
import type { PublicContent } from "../../../shared/schema";
import { createResourceCache } from "../../../shared/resource-cache";
import { api, apiOrigin, ApiError } from "../../lib/platform-api";
import { startContentSync } from "../../lib/content-sync";
import {
  observeRecovery,
  ReadFailure,
  retryRead,
} from "../../lib/read-recovery";
import { ContentContext } from "./content-context";

let minimumRevision = 0;
const cacheKey = "mashrouak-public:v1:" + apiOrigin;
function valid(content: PublicContent) {
  return (
    content &&
    Array.isArray(content.entries) &&
    typeof content.updatedAt === "string" &&
    (content.revision === undefined ||
      (Number.isSafeInteger(content.revision) && content.revision >= 0)) &&
    content.entries.every(
      (entry) =>
        entry &&
        typeof entry.slug === "string" &&
        typeof entry.kind === "string" &&
        entry.data &&
        typeof entry.data === "object",
    )
  );
}
let saved: PublicContent | null = null;
try {
  const stored = JSON.parse(localStorage.getItem(cacheKey) || "null");
  if (valid(stored)) {
    saved = stored;
    minimumRevision = Number(stored.revision ?? 0);
  }
} catch {}
const resources = createResourceCache(async (path, options) => {
  const publicRequest = path === "/public/content";
  return retryRead(async () => {
    const requested =
      publicRequest && minimumRevision
        ? `${path}?min_revision=${minimumRevision}`
        : path;
    let content: PublicContent;
    try {
      content = await api<PublicContent>(requested, {
        ...options,
        cache: "no-store",
        signal: AbortSignal.any([options.signal!, AbortSignal.timeout(15000)]),
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "publication_not_ready")
        throw new ReadFailure(
          "transport",
          error.code,
          error.status,
          error.retryAfter,
        );
      throw error;
    }
    if (!valid(content))
      throw new ReadFailure("invalid-data", "Invalid public content");
    if (publicRequest && Number(content.revision ?? 0) < minimumRevision)
      throw new ReadFailure("transport", "publication_not_ready", 409);
    if (publicRequest && !options.signal?.aborted) {
      minimumRevision = Math.max(
        minimumRevision,
        Number(content.revision ?? 0),
      );
      saved = content;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(content));
      } catch {}
    }
    return content;
  }, options.signal!);
});

export function ContentProvider({ children }: { children: ReactNode }) {
  const preview = new URLSearchParams(window.location.search).get("preview");
  const path = preview
    ? `/preview/${encodeURIComponent(preview)}`
    : "/public/content";
  const resource = resources.useResource<PublicContent>(
    path,
    preview ? 30000 : 0,
  );
  const content = resource.data ?? (preview ? null : saved);
  const refresh = useCallback(() => resources.refresh(path), [path]);
  const retry = useCallback(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (preview) {
      return observeRecovery((active) => {
        if (active) void refresh();
      });
    }
    return startContentSync({
      eventsUrl: `${apiOrigin}/api/public/events`,
      revisionUrl: `${apiOrigin}/api/public/revision`,
      refresh,
      currentRevision: () =>
        Number(
          (resources.peek(path).data as PublicContent | null)?.revision ??
            saved?.revision ??
            0,
        ),
      notice: (revision) => {
        minimumRevision = Math.max(minimumRevision, revision);
      },
    });
  }, [path, preview, refresh]);
  return (
    <ContentContext.Provider
      value={{
        content,
        unavailable: !!resource.error,
        preview: !!preview,
        loading: !content && resource.loading,
        retry,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}
