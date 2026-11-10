# Publishing investigation and resolution

## Observed evidence

The reported word `خدمmnاتنا` was stored in **published** `settings/global → navigation[1].label.ar`. The same record's draft already contained `خدماتنا`. Its most recent save occurred after its most recent publication: 17:29:54 versus 17:29:48 on 9 November 2026, Riyadh time. The old editor badge still said Published whenever a previous published snapshot existed, even when the saved draft was newer. This made a saved correction look public when it was still private.

The publishing endpoint did await its database operation. Inspection did **not** establish that D1 silently refused a second committed update. That claim would go beyond the evidence. The confirmed delivery defects were the misleading state above, missing publication-aware client invalidation, and a resource-cache race: invalidation could coalesce onto an older in-flight request and let its older snapshot remain authoritative in the client. The regression test reproduces older responses arriving after the newest response.

There was also a separate production wiring defect. The existing public Pages deployment was still commit `d7ce37a16aeaca8758d575d0d81df7a256eb490b`. Its `/api/public/content` returned SPA **HTML with HTTP 200**, rather than CMS JSON. That deployment cannot display CMS changes until the new source and correct API routing are deployed. Its project, Git connection, branch, build settings and domains were preserved.

## Committed publication and delivery

The requested native Node.js/PostgreSQL backend now commits the published JSON, published route/order, audit event, monotonically increasing publication revision and PostgreSQL notification together. Single-entry publication uses an atomic SQL statement; multi-entry visual publication uses one serializable transaction and one pooled client. Version conflicts or invalid/private references roll back the operation. Notifications become visible only after commit.

Public content reads the revision and published rows from a consistent transaction and can require `min_revision`. Draft values, draft routes and draft ordering are never used as the public authority. Published routes are independently protected against collisions.

The public client receives streaming publication events and has a small conditional revision check as a fallback. Invalidating the resource aborts the older generation; late responses cannot replace a newer generation. The client rejects revisions below its observed publication revision. Focus/visibility revalidation remains available, without requiring a visitor to clear caches or rebuild the site.

The dashboard distinguishes unpublished changes, waits for the committed receipt and verifies the corresponding public snapshot before displaying publication success. HTML 200 responses are rejected as invalid API responses. Visual publication scope is explicit, so unrelated saved drafts are not promoted.

## Cache boundaries

Dynamic content uses `private, no-cache, must-revalidate`, an ETag based on publication revision, and `CDN-Cache-Control: no-store`. The revision endpoint supports 304. The same-origin Pages proxy streams responses without inventing an edge content cache.

This does not disable caching globally. Hashed static assets retain a one-year immutable policy. Public image bytes support ETag revalidation after metadata/authorization checks, and Cloudinary caches optimized derivatives. Private image bytes remain no-store. No service worker registration or React Query cache is present in the public application; the inspected client cache is the shared resource cache.

## Services corrections

The exact navigation typo is corrected in both snapshots. The audit also corrected the Arabic genitive after `مناسبة لـ:`, added the missing sentence boundary in the Arabic/English service-combination paragraph, standardized catalog terminology, and changed the awkward English operation-log label to activity log. The original six offerings and their capabilities remain intact.

Corrections transform draft and published JSON independently, using only confirmed exact wording. They create revisions/audits and advance the publication revision when published text changes. Unrelated private draft values are preserved. Original D1 data remains intact; corrections were applied to the verified PostgreSQL destination and source defaults.

## Verification and limits

- `tests/resource-cache.test.ts`: late older responses cannot replace the newest generation; HTML API fallback is rejected.
- `tests/publishing.integration.ts`: three consecutive saves/publications, increasing committed revisions, draft route/order isolation, transaction rollback, expiring preview and copy correction isolation.
- `tests/publishing.browser.runner.mjs`: 27 checks, including three consecutive dashboard edits/publications of one heading. Each publication is verified through the public API, an already-open browser without refresh, a fresh private session and a refresh. A fourth saved draft remains invisible.
- `tests/services.browser.runner.mjs`: 27 checks using an isolated clone of actual local CMS content, covering every service's bilingual fields and corrected dashboard navigation.
- Native media/auth/chat integration and PostgreSQL migration tests are documented in the upgrade report.

These results prove the local implementation against real PostgreSQL. They do not claim that the fixed source has been accepted on hosted Render/Pages. The current target is the existing Render Free service with Neon Free; no paid service or DNS work is required by this fix. Fresh credentials, approved schema/data preparation, reviewed rollout and hosted acceptance are detailed in [FINAL_DEPLOYMENT_HANDOFF.md](FINAL_DEPLOYMENT_HANDOFF.md), with current outcomes in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md).
