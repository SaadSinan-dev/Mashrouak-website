import { api, ApiError } from "./platform-api";
import type { ContentEntry, PublicContent } from "../../shared/schema";
export interface PublicationReceipt {
  revision: number;
  updatedAt: string;
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
  const published = publicSnapshot.entries?.find(
    (item) => item.id === entry.id,
  );
  // Knowledge is intentionally excluded from the public content endpoint.
  if (
    entry.kind !== "knowledge" &&
    (!published ||
      JSON.stringify(published.data) !== JSON.stringify(result.entry.published))
  )
    throw new ApiError("publication_not_verified", 502);
  return result;
}
