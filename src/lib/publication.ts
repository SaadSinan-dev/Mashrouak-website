import { api, ApiError } from "./platform-api";
import {
  publicMetric,
  type ContentEntry,
  type PublicContent,
  type ResultContent,
} from "../../shared/schema";
export interface PublicationReceipt {
  revision: number;
  updatedAt: string;
}
export function matchesPublicSnapshot(
  entry: ContentEntry,
  snapshot: PublicContent,
) {
  const item = snapshot.entries.find((candidate) => candidate.id === entry.id);
  if (
    entry.kind === "knowledge" ||
    (entry.kind === "results" &&
      entry.published &&
      !publicMetric(entry.published as ResultContent))
  )
    return !item;
  return (
    !!item &&
    item.slug === entry.slug &&
    item.sort_order === entry.sort_order &&
    JSON.stringify(item.data) === JSON.stringify(entry.published)
  );
}
export async function publishContent(entry: ContentEntry) {
  const result = await api<{
    entry: ContentEntry;
    publication: PublicationReceipt;
  }>(`/admin/content/${entry.id}/publish`, {
    method: "POST",
    body: JSON.stringify({ version: entry.version }),
  });
  if (
    result.entry?.status !== "published" ||
    result.entry.version <= entry.version ||
    !Number.isSafeInteger(result.publication?.revision)
  )
    throw new ApiError("publication_not_verified", 502);
  const publicSnapshot = await api<PublicContent>(
    `/public/content?min_revision=${result.publication.revision}`,
    { cache: "no-store" },
  );
  if (!matchesPublicSnapshot(result.entry, publicSnapshot))
    throw new ApiError("publication_not_verified", 502);
  return result;
}
