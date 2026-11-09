export { api, ApiError, mediaUrl } from "../../src/lib/platform-api";
import { ApiError } from "../../src/lib/platform-api";
import type { CopyKey } from "./locale-context";
export function errorKey(error: unknown): CopyKey {
  if (!(error instanceof ApiError)) return "connection";
  const map: Record<string, CopyKey> = {
    invalid_credentials: "invalidCredentials",
    authentication_required: "unauthorized",
    permission_denied: "forbidden",
    version_conflict: "conflict",
    publication_not_verified: "publicationNotVerified",
    publication_not_ready: "publicationNotVerified",
    already_exists: "duplicate",
    rate_limited: "rate",
    validation_failed: "invalid",
    publication_invalid: "publicationInvalid",
    private_evidence: "privateEvidence",
    media_in_use: "mediaInUse",
    media_published: "mediaPublished",
    media_migration_required: "mediaMigration",
    cloudinary_not_configured: "cloudinarySetup",
    cloudinary_authentication_failed: "cloudinaryCredentials",
    cloudinary_unavailable: "cloudinaryUnavailable",
    cloudinary_failed: "cloudinaryUnavailable",
    cloudinary_invalid_response: "cloudinaryUnavailable",
    cloudinary_rate_limited: "rate",
    request_too_large: "imageError",
    unpublish_before_delete: "unpublishFirst",
    image_size: "imageError",
    image_type: "imageError",
    server_error: "serverError",
  };
  return map[error.code] ?? "serverError";
}
