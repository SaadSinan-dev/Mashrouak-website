# Production readiness report — 10 November 2026

**Source fixed and locally verified. Hosted production acceptance remains pending.** The owner chose to handle provider accounts and credential rotation while local verification continued. No GitHub push, Render deployment, remote PostgreSQL write, paid resource or DNS change was performed in this pass.

## A. Confirmed incident and implementation

The reported deployed commit and current/fetched `origin/main` are `9273a7261843dd87895d219b3ecb29a8c053b6de`, branch `main`. Inspection of that commit shows `backend/src/database.ts → createPostgresPool()` supplying `options: -c search_path=... -c default_transaction_isolation=...` directly to `new Pool()`. Installed `pg` serializes this into the connection startup packet. Neon rejects that startup setting on the transaction-pool endpoint, before the first encoding query. The `assertUtf8` stack location is where connection acquisition failed, not an encoding failure. URL changes could not remove code-supplied options.

| Files | Implemented behavior |
|---|---|
| `backend/src/database.ts` | Sanitizes startup settings; rejects inherited PGOPTIONS; uses full remote TLS verification, four-connection pools, awaited direct initialization, transaction-local schema/timeouts and serializable isolation on the checked-out query connection |
| `backend/src/server.ts`, `server-entry.ts`, `backend/scripts/build.mjs` | Encoding/schema checks before readiness; actual direct notification connection; pooled-only revision fallback; transaction-scoped cleanup lock; sanitized production startup failure; graceful shutdown |
| `backend/src/migrations.ts`, administrative scripts | Direct endpoint required for schema/import/backup/provisioning; optional `DIRECT_DATABASE_URL` is implemented, not just documented |
| `backend/scripts/check-database.ts` | Protected read-only checks for both URLs, encoding, schema, migration checksums/status and publication revision; remote checks require the rotated-credentials flag |
| `render.yaml`, `backend/.env.example` | Existing native Free service settings, no Render database/disk/worker/cron/pre-deploy; direct URL documented |
| `functions/api/[[path]].ts`, `public/_redirects` | Restricted same-origin Pages API proxy, streaming/cookies/status/method preservation, JSON failures; invalid SPA redirect removed in favor of Pages fallback |
| `src/lib/platform-api.ts`, `ContentProvider.tsx` | 90-second request allowance for Free cold wakeup; no automatic write retry |
| `admin-dashboard/src/MediaLibrary.tsx` | Metadata editor closes after authoritative media-list refresh, avoiding a stale card immediately after save |
| New connection/proxy/runtime tests and `scripts/check-build-secrets.mjs` | Installed driver startup-message/TLS inspection, direct/pooled schema behavior, compiled server readiness, HTTP method/error coverage and configured-secret build scan |

Installed-driver inspection confirmed that `sslmode=verify-full` leaves normal certificate-chain/hostname verification enabled; it avoids the ambiguous `require` alias warning. URL `uselibpqcompat` is removed. Insecure remote SSL modes are rejected. Unit tests inspect the actual `Client.getStartupConf()` result without making a network connection. An inherited nonempty `PGOPTIONS` is refused because the installed driver falls back to it even when configuration options are empty.

Direct initialization uses pg's awaited `onConnect`, not an asynchronous event callback. Pooled application queries run `BEGIN ... SERIALIZABLE`, then await `SET LOCAL search_path` and timeouts before the statement, and commit on that same client. Reused connections cannot silently switch schemas. Migrations/session LISTEN do not go through the transaction pool. Without direct LISTEN, conditional revision polling continues and the event endpoint returns 204. Local pooled-mode tests force this execution path against real PostgreSQL; they do **not** emulate the Neon proxy or prove real Neon TLS/network connectivity.

## B. Actual commands and outcomes

Commands were run from the repository root unless specified. Tests use generated disposable local schemas/databases; remote database mutation is refused by fixtures. PostgreSQL 18.6 is running locally with UTF8; Node is 24.19.0.

| Exact command | Real outcome and scope |
|---|---|
| `npm ci --include=dev` | Passed: 415 installed, 425 audited, zero vulnerabilities. Initial attempt hit a Windows DLL lock from running development servers; project-owned servers were stopped and clean install reran successfully. |
| `npm run typecheck:all` | Passed public, admin and backend, including new regression tests. |
| `npm run lint` | Exit 0; two pre-existing set-state-in-effect warnings in admin App and SupportInbox. |
| `npm test` | **53 passed**, 13 files: includes five connection regressions, nine new method/failure proxy cases, cache-generation and HTML-response protection. |
| `npm run test:integration` | **145 assertions passed**, actual Node/Hono and real PostgreSQL; Cloudinary calls mocked. Includes auth/session/permissions, content, chat, media protection/replacement/delete/failures. Injected provider/database errors in output are expected rollback cases. |
| `npx tsx tests/migration.integration.ts` | **22 assertions passed**: counts, identifiers, UTC timestamps, exact no-op rerun, refusal of different nonempty targets, manifest checks and relationship rollback. |
| `npm run test:publishing` | **36 assertions passed**: three successive saves/publications, increasing committed revisions, snapshot consistency, draft route/order isolation, conflicts/rollback and preview. |
| `npm run test:neon -w @mashrouak/backend` | **7 assertions passed** on real local PostgreSQL, forced transaction-pool mode, five schema-reuse reads and rollback. **Not a live Neon test.** |
| `npx tsx tests/runtime.integration.ts` | Compiled production Node backend started against a generated UTF8 local database, passed readiness and three `/healthz` requests, stayed running, and produced no startup-parameter failure. Only its generated test database was disposed. |
| `npm run test:publishing:browser` | **27 checks passed** after the new driver changes: same heading saved/published three times, public API, existing tab without refresh, fresh private context and refresh each time; fourth unpublished draft stays private. |
| `npm run test:visual:browser` | **28 checks passed**: exact field selection, bilingual rich/media editing, save/publish, private preview, revisions, undo/redo, real viewport sizes, section order/visibility/background and safe forms. |
| `npx tsx tests/services.browser.runner.mjs` | **27 checks passed**: six genuine offerings in both languages, CMS editor/public equivalence, corrected navigation, no annotation layout wrappers and no uncaught browser errors. |
| `npm run test:media:browser` | **26 checks passed** after the metadata editor timing fix. Initial final run exposed form closure before refreshed card data; source was corrected and suite reran successfully. Real local backend/PG; provider mocked. |
| `npm run test:devices:browser` | **21 checks passed**: Arabic/English, light/dark, actual transparent WebGL pixels, exact supplied logo variant, retained renderer, mobile overflow, reduced motion and unsupported WebGL fallback. |
| `npm run build:all` | Public, admin and native backend production builds passed. Device scene is lazy loaded; its approximately 581 kB minified chunk still produces a size warning. |
| `node artifacts/validate-render.mjs` | Passed current official Render Blueprint JSON schema. Existing validator reported ignored optional URI formats; structural validation passed. No provider resources created. |
| `npx wrangler pages functions build functions --outdir artifacts/pages-functions` | Pages Function compiled successfully. |
| `npx wrangler pages dev dist --port 8796 --ip 127.0.0.1 --compatibility-date 2026-11-09` | Actual local Pages runtime parsed zero redirect rules and two header rules; `/services` returned 200 HTML; `/api/public/content` returned 503 JSON `api_proxy_not_configured` with intentionally absent provider bindings. No SPA HTML false success. |
| `npm run db:check -w @mashrouak/backend` | Local direct connection/UTF8/schema succeeded; four migration checksums applied; revision 8 at inspection. Local optional DIRECT URL absent. No remote connection attempted. |
| `node scripts/check-build-secrets.mjs` | 115 generated text assets scanned across public/admin/backend builds; **zero configured-secret matches**. Checks actual ignored local secrets and database password without printing values. This is a bounded exact-value scan, not a claim about all possible unknown secrets/history. |
| `git check-ignore backend/.env` | Confirmed ignored. Source secret-pattern scan found only local URL placeholders and synthetic unit credentials after removing credential text from the admin template. |
| `git -c core.safecrlf=false diff --check` | Passed. `git fetch origin main` confirmed the stated base commit. Working changes preserved, no reset/clean/commit/push. |

The one-off Render validator lives in ignored `artifacts`; it fetched [the official schema](https://render.com/schema/render.yaml.json). Browser evidence/check lists are in ignored `artifacts/{publishing,visual,services,cloudinary,devices}-qa`. Tests inspect API/browser failures; expected reduced-motion development notices are not fatal errors. Exact PowerShell local Pages response checks were:

```powershell
Invoke-WebRequest 'http://127.0.0.1:8796/services'
Invoke-WebRequest 'http://127.0.0.1:8796/api/public/content' -SkipHttpErrorCheck
Invoke-RestMethod 'http://localhost:8787/healthz'
```

Earlier live Cloudinary evidence in this continuous task: `npx tsx artifacts/verify-live-cloudinary.ts` passed **three read-only delivery checks**, including SHA-256 equivalence of a preserved original and signed optimized delivery. No live Cloudinary upload/replacement/deletion was executed in this pass. Mocked tests prove application behavior, not live provider writes.

## C–E. Provider status

| Target | Prepared/verified locally | Hosted status |
|---|---|---|
| Existing Render Free service | Matching repo/main, Node/build/start/health configuration; schema validated; compiled runtime healthy locally | Reported deployed commit 9273a72 had the startup failure. Fixed commit has not been pushed/deployed here. Actual service URL, settings, region, health and cold wakeup are unverified. |
| Public `mashrouak-net` Pages | Independent `dist`, real Function build/routing, production build and browser CMS checks | Existing project preserved. New fixed source deployment, server bindings and hosted API acceptance unverified. Earlier inspected d7ce37a API HTML problem is historical evidence, not a claim about today's latest provider state. |
| Admin `mashrouak-admin` Pages | Independently configured Git project from earlier task; `admin-dashboard/dist` with actual preview bundle; builds/browser checks pass | Creation/configuration previously verified; current deployed commit, login and actual Render integration unverified. |
| Neon Free | Secure direct/pooled code, admin separation, safe read-only check, checksummed migrations and import commands prepared | Neither fresh pooled nor fresh direct connection tested. Rotation is owner-managed; old compromised credentials were not used. No Neon schema/import writes performed. |
| Data preservation | Original populated D1 JSON/SQLite retained. Initial local PostgreSQL import verified every count/hash before commit. Later Services corrections audited separately. | Neon import not executed. Do not substitute empty remote D1 or overwrite nonempty Neon records. |
| Cloudinary | Existing integration retained; mocked application suite passes; earlier three live read-only checks passed | Actual hosted upload/private retrieval/replacement/deletion still require acceptance after environment/deployment setup. |

The owner declined provider integration and chose account steps. There is no authenticated Render dashboard/API session or fresh approved Neon credential in this work. These are evidence boundaries, not successful deployment claims. Existing Render/Neon regions were not verified; no Frankfurt assumption, service relocation or DNS modification remains in the active configuration.

## CMS publishing and Services resolution

Confirmed CMS defects were a misleading Published badge with a newer private draft, a client invalidation race coalescing onto an older request, and missing publication-aware invalidation. An earlier deployed public app also returned HTML 200 for the API. The backend was not proven to discard a second committed write. The full evidence is in [PUBLISHING_ROOT_CAUSE.md](PUBLISHING_ROOT_CAUSE.md).

The fixed publication transaction commits snapshots, routes/order, audit, increasing revision and notification together. Dashboard success follows backend commit and public-snapshot verification. Public content is read consistently and cannot include drafts. Cache generations abort/ignore old responses; streaming events plus conditional revision fallback deliver subsequent publications. Dynamic content has revalidation/CDN no-store; hashed static assets and image caching remain efficient. No service worker or React Query cache is involved.

`خدماتنا` is corrected to `خدماتنا` in published navigation and the editor. Both-language audit corrected confirmed grammar, sentence boundaries and consistent catalog/activity-log terminology, preserving all six offerings and layout. Copy corrections transform drafts/published snapshots independently, preserving unrelated private edits and recording revisions/audits. This is verified locally; the preserved raw D1 import source predates those corrections, so the approved correction command must accompany its future production import.

## F. Remaining owner actions

1. Rotate the compromised Neon role password; store fresh direct/pooled URLs privately and run the protected read-only check.
2. Approve the specific Neon schema/import/copy-correction writes and source snapshot after reviewing the dry run. Preserve latest local data and raw source backups.
3. Enter exact Render/Pages variables, verify the existing Free service and independent build settings, and review the complete diff before approving a main push/deployment.
4. Verify hosted health, both Pages apps, login, three publications, draft isolation, media and cold wakeup using the handoff procedure.

Every navigation path, variable, safe command and acceptance step is in [FINAL_DEPLOYMENT_HANDOFF.md](FINAL_DEPLOYMENT_HANDOFF.md). Provider writes are deliberately separate from the approved local checks.

## G. Readiness scorecard

“LOCAL VERIFIED” is not hosted completion. No hosted item is marked complete based on a mock or localhost result.

| Requested state | Evidence/status |
|---|---|
| SOURCE CODE FIXED | **LOCAL VERIFIED** — startup/TLS/transaction/proxy/CMS defects fixed; regression suites pass |
| NEON CONNECTION VERIFIED | **PENDING** — fresh real direct and pooled checks not executed |
| BACKEND BUILD VERIFIED | **VERIFIED** — native production build passes |
| BACKEND RUNTIME VERIFIED | **LOCAL VERIFIED** — compiled server/UTF8/readiness/three health requests; Render pending |
| DATABASE MIGRATIONS VERIFIED | **LOCAL VERIFIED** — four checksummed migrations, 22 regression assertions; Neon pending |
| EXISTING DATA MIGRATION VERIFIED | **LOCAL VERIFIED** — preserved actual source counts/hashes imported to local PG; Neon pending |
| PUBLIC WEBSITE DEPLOYED AND VERIFIED | **PENDING** — fixed source not deployed/accepted on hosted project |
| ADMIN DASHBOARD DEPLOYED AND VERIFIED | **PENDING** — separate project prepared; hosted runtime acceptance pending |
| AUTHENTICATION VERIFIED | **LOCAL VERIFIED** — native session/authorization/browser tests; hosted cookies/login pending |
| CMS PUBLISHING VERIFIED | **LOCAL VERIFIED** — three consecutive publications through API/browser/private/refresh; hosted pending |
| CLOUDINARY MEDIA VERIFIED | **PARTIAL** — local mocked application checks plus earlier live read-only delivery; hosted writes pending |
| MOBILE/DESKTOP ACCEPTANCE VERIFIED | **LOCAL VERIFIED** — responsive visual/media/device browser checks; hosted pending |

## Git diff and deployment impact

The complete dirty checkout was preserved on `main`. Changes include earlier visual-editor/public-component/device work, Services/CMS and cache fixes, PostgreSQL/media/import compatibility, current runtime/Neon fixes, configuration, regression tests and documentation. A large part of several backend files is formatting; it must not be mistaken for newly replaced business behavior. Applied SQL migration files were not rewritten. Dependency versions were not upgraded in this incident pass.

Final tracked diff at inspection: **65 files, 6,104 insertions, 1,462 deletions**, plus **11 new untracked source/test/report files** (76 paths total). This includes the existing authorized work, not only the startup fix. The shorter Arabic guide replaces obsolete paid instructions with current Free/Neon navigation and links to the comprehensive handoff. `git diff --check` passes.

New files include `backend/src/server-entry.ts`, `backend/scripts/check-database.ts`, `tests/neon-connection.test.ts`, `tests/neon.integration.ts`, `tests/runtime.integration.ts`, `tests/proxy-methods.test.ts`, `scripts/check-build-secrets.mjs`, and the deployment/investigation reports. `git diff --stat` omits untracked files; inspect them as part of release review. No credential, local database, private snapshot, compiled bundle or browser artifact is staged by this work.

A reviewed push to main may automatically rebuild the **public Pages, admin Pages and Render service**. Schema/data/env preparation must precede that rollout. Existing custom domains and source data remain intact. The repository is ready for that reviewed rollout; the production incident remains open until fresh Neon and hosted Render/Pages acceptance succeeds.
