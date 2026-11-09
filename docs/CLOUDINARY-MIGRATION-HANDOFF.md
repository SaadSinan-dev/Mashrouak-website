# Media handoff — 9 November 2026

## Coordination

The platform/loading task does not perform a Cloudinary migration. The owner explicitly chose to keep a separate migration process running in this checkout and instructed this task to leave its files untouched. Consequently, media files/configuration can change concurrently. Read their current contents before continuing; do not restore the baseline below over newer migration work.

## R2 baseline verified before concurrent migration

The public React app and independent admin app share a Hono Cloudflare Worker. D1 stores CMS snapshots, users, sessions, conversations, media metadata and audits. R2 originally stores image bytes through `env.MEDIA`; bytes are never stored in D1. Local Wrangler/Miniflare provide account-independent D1/R2 testing.

Baseline media routes, all beneath `/api/media`:

| Method/path   | Behavior                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`       | Owner/editor list, alt text, visibility and content usage.                                                                                                             |
| `POST /`      | Owner/editor multipart upload, bilingual alt text, visibility, size/type/signature validation. Writes bytes to R2 and metadata to D1; compensates storage if D1 fails. |
| `GET /:id`    | Streams the stored object. Public assets can be cached; private assets require owner/editor authentication and otherwise return 404.                                   |
| `PUT /:id`    | Updates bilingual alternative text.                                                                                                                                    |
| `DELETE /:id` | Blocks referenced media, then removes metadata/object and records an audit event.                                                                                      |

Migration `0001_platform.sql` defines `media`: `id` (primary key), `object_key` (unique), `filename`, `type`, `size`, `alt_ar`, `alt_en`, `visibility` (`public`/`private`), `created_at`. Content refers to stable `/api/media/:id` URLs in draft/published JSON. Image fields include their localized alternative text. Verified result publication checks that evidence is not linked to private uploads.

R2 ownership was in `backend/src/media.ts`; the binding type was `Env.MEDIA: R2Bucket` in `backend/src/types.ts`; `backend/wrangler.jsonc` originally bound `MEDIA` to `mashrouak-media`. Public callers use `src/lib/platform-api.ts` → `mediaUrl`, `SmartImage`, project artwork/gallery and managed sections. Admin callers use `MediaLibrary.tsx` and `FieldEditor.tsx`. The client optimizes decoded images to WebP before upload. Preserve the existing API contracts and image skeleton/retry frames when replacing provider internals.

## Concurrent changes observed, not performed by this task

The running migration has added `backend/src/cloudinary.ts`, provider fields in `Env`, `backend/migrations/0002_cloudinary.sql`, migration/legacy scripts and Cloudinary-specific tests. The observed media API now includes `POST /:id/replace` and authenticated Cloudinary delivery. Wrangler configuration has been changed by that process and the R2 binding was removed there. This task did not remove that binding or activate a remote storage account.

`0002_cloudinary.sql` is additive: Cloudinary asset/public IDs, resource/delivery type, version, format, secure URL, dimensions, revision and update timestamp; unique provider indexes; and a durable `media_cleanup` table. Historical `object_key` values remain. Confirm these details against the latest file because the migration is still active.

## Data and tests

The baseline platform integration suite previously passed 82 assertions with disposable real D1/R2/workerd bindings, including upload validation, public/private retrieval, CMS isolation, permissions and chat. Browser QA verified a disposable local WebP upload and preview. No production R2 object inventory or remote media record count was verified by this task.

Relevant files: `tests/platform.integration.ts`, `tests/skeleton.test.tsx`, `tests/resource-cache.test.ts`, `tests/browser.qa.mjs`, `tests/loading.browser.mjs`. The separate migration has supplied `tests/cloudinary-migration.test.ts`, `tests/cloudinary.mock.ts` and `tests/cloudinary.browser-server.ts`; inspect and run those as part of that migration. `tests/ui-backend.ts` supports isolated UI checks and does not require R2 activation. Its startup uses the existing built Worker; rebuild deliberately when choosing which implementation to test.

## Continuation considerations

1. Keep stable media IDs/URLs and all historical content/revision references; inventory first and make migration repeatable.
2. Preserve private authorization. A publicly reachable provider URL must not bypass private `/api/media/:id` checks.
3. Preserve server validation, MIME handling, alt text, usage checks, cache behavior and failure compensation. Replacement/deletion need concurrency-safe cleanup.
4. Keep provider credentials server-side and out of logs, frontend bundles, docs and test evidence.
5. Reconcile the active process’s configuration and additive migrations before a staging rollout. No production deployment is authorized by this handoff.

## Cloudinary implementation completion (migration task)

The migration task verified the remote account and media inventory: R2 is not enabled, the existing production D1 media table is empty, and the Worker target is not yet deployed. One historical local WebP and its record are preserved; transfer waits for Cloudinary credentials. The configured local store now retains the original 18 content records, one media record and six audit events after discovering a pre-existing local identifier mismatch. The older store is retained and an additional ignored backup was saved.

Current production code and all active test fixtures use D1 plus Cloudinary, with no R2 binding or R2Bucket type. The old baseline above remains historical reference. Cloudinary requests use native Worker APIs, signed server-side REST uploads and authenticated assets. Stable API routes proxy optimized public derivatives and authorized private originals. Replacement retains IDs/URLs; visibility, bilingual alt text, reference protection and audits remain in D1. A durable journal handles storage compensation and scheduled cleanup. Provider URLs and credentials are not exposed to clients.

Use [Cloudinary setup](CLOUDINARY_SETUP.md), [the migration report](CLOUDINARY_MIGRATION_REPORT.md) and [media QA coverage](CLOUDINARY_QA.md) for the final implementation and credential-dependent verification boundary. Production secret uploads, remote schema updates and rollout remain unexecuted. The earlier platform validation is historical; the migration report records the final media-specific checks.
