# Production upgrade implementation and verification

**Historical implementation report (9 November).** Current deployment target, runtime incident fixes and evidence are in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) and [FINAL_DEPLOYMENT_HANDOFF.md](FINAL_DEPLOYMENT_HANDOFF.md), dated 10 November. Render Free plus Neon Free supersedes earlier paid proposals. Provider state below records earlier inspection, not current hosted acceptance.

Date: 9 November 2026, Asia/Riyadh. Work remains in the existing checkout; existing changes and original brand/media assets are preserved. No ZIP, replacement public project, Git commit/push, paid resource, production database write or DNS cutover was performed.

## Implemented

The independent dashboard now has a three-panel Visual Website Editor. Its same-origin preview bundle imports the actual public route tree, components, styles and providers. Exact field references identify text, service/project/result values, navigation, custom sections and images. The navigator follows section order/visibility; the inspector edits bilingual values, safe Markdown bodies, image references/alternative text and supported section backgrounds. Desktop/tablet/mobile previews use actual 1440/768/390-pixel layout viewports and fit into the editor workspace.

Draft state remains in memory with bounded undo/redo and unsaved indicators. Save/publish operations use version checks and serializable transactions; publication scope is reviewed explicitly. History restores a private draft. Preview tokens store a server-side snapshot, are hashed and expire after 15 minutes; the public preview retains its selected language/theme. Origin/window/nonce checks protect the editor bridge, standalone preview pages expose no draft data, and the interactive canvas blocks form submission.

The hero contains a modeled monitor and smartphone, with rounded housings, stand/base, screen glass, buttons and cameras, PBR materials and generated studio reflections. Supplied Arabic/English logo files are drawn with contained aspect ratios into correctly proportioned screen textures. The alpha-enabled renderer has a null scene background and transparent clear color. Theme materials/lights adapt on the same renderer. Rendering stops when settled/offscreen/hidden, DPR is bounded, owned resources are disposed, and static fallback is exclusive to failure/unsupported/reduced-motion states.

The backend is native Node.js/Hono with `@hono/node-server` and a PostgreSQL pool. Application queries use PostgreSQL semantics and bound parameters; multi-statement transactions share one client, roll back on error and retry serialization conflicts. Native migrations have checksums and advisory locking, require UTF8 and add publication/routing/preview state. The server listens on Render's supplied port at `0.0.0.0`, provides `/healthz`, handles shutdown, reconnects notification delivery and performs persisted hourly cleanup with a cross-instance advisory lock.

Cloudinary remains the provider. Original media IDs, references, metadata and source bytes are preserved. Private access is checked before provider retrieval; browser responses do not expose provider credentials or private source URLs. D1 is a read-only migration source, rather than a runtime binding on Render.

## Data preservation

The protected populated local D1 snapshot was imported into a new UTF8 PostgreSQL database. Every source table's count and SHA-256 matched before commit. Initial counts: users 2, sessions 3, content 18, revisions 12, audits 36, conversations 2, messages 6, media 1, rate limits 28, preview tokens 5 and cleanup jobs 0.

The original D1 store and SQLite backup remain intact under ignored local runtime storage. A separate read-only remote D1 SQL/JSON backup contained zero application records. Source selection is explicit in the guide; the empty remote database is not silently substituted for the populated local source.

Services corrections were applied after raw import verification, with independent draft/published transformations and their own revisions/audits. Normal expiration cleanup can subsequently remove expired transient rows. Current destination counts are therefore not falsely presented as an unchanged raw-import manifest. A consistent private PostgreSQL backup was also created.

Import utilities reject tampered manifests, unmapped tables/columns, inconsistent relationships and different nonempty targets. Exact reruns are no-ops. Timestamp normalization preserves SQLite's UTC convention independently of the machine's timezone. A dry run does not apply migrations or import records.

## Verification

| Check | Observed result |
|---|---|
| Unit tests | 39 passed |
| Native auth/content/chat/media integration | 145 assertions passed on real local PostgreSQL; Cloudinary mocked |
| Publication/visual transaction regression | 36 assertions passed, including three successive publications |
| Database migration regression | 22 assertions passed, including counts, identity/time preservation, no-op rerun, refusal to overwrite and full rollback |
| Consecutive-publication browser verification | 27 checks passed through dashboard, API, existing/fresh sessions and refresh |
| Services proofreading/browser verification | 27 checks passed using an isolated clone of actual local content |
| Media browser verification | 26 checks passed on native Node/PostgreSQL with mocked provider |
| Device language/theme/transparency/fallback verification | 21 checks passed; screenshots visually inspected |
| Live Cloudinary verification | 3 read-only delivery checks passed, including original SHA-256 and signed optimized delivery; no provider writes |
| Render configuration | Validated against the current official JSON schema; no resources created |
| Pages proxy | Compiled successfully with Wrangler Pages Functions; origin/cookie/streaming policy unit tests pass |

Expanded visual-editor verification and final builds are recorded below after the final pass. Evidence is in ignored `artifacts/publishing-qa`, `services-qa`, `visual-qa`, `cloudinary-qa` and `devices-qa`. The injected provider/database failure cases in integration tests are expected; their rollback/error assertions passed. Development reduced-motion notices are expected and are distinct from uncaught application errors.

## Deployment state

The existing `mashrouak-net` Pages project remains connected to `SaadSinan-dev/Mashrouak-website`, production branch `main`, repository-root build `npm run build`, output `dist`. Its existing leading tab in the command was preserved. Its deployed commit at inspection was `d7ce37a16aeaca8758d575d0d81df7a256eb490b`.

The separate Git-connected `mashrouak-admin` Pages project was created and verified. It uses the same repository/main branch, repository root, command `npm run build -w @mashrouak/admin`, output `admin-dashboard/dist`, independent environment and deployment history. Automatic Git deployments are enabled. Its reserved subdomain is `mashrouak-admin.pages.dev`; it has no deployment yet. Creating it did not change the public project's source, branch, build configuration or domains.

The earlier paid infrastructure proposal was superseded on 10 November. Current `render.yaml` uses the existing Free Node service and externally supplied Neon Free URLs, with no database resource, disk, cron or pre-deploy command. Actual provider regions are unverified and must not be assumed. Use the current handoff; paid infrastructure was not created.

Intended custom domains are `mashrouak.net`, `admin.mashrouak.net` and `api.mashrouak.net`. They have not been configured/tested in this work. The API DNS destination must be copied from the actual Render service after it exists. The same-origin Pages proxy avoids depending on third-party cookies for temporary Pages/Render hostnames; actual custom-domain HTTPS/authentication verification still remains.

See [publishing root cause](PUBLISHING_ROOT_CAUSE.md) for evidence and the distinction between local resolution and pending production rollout. The Arabic root deployment guide contains the exact commands, source backup/import sequence, domain routing, provider limitations, rollback considerations and production checklist.
