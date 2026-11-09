# Cloudinary migration report — 9 November 2026

## Result

The existing platform now uses signed Cloudinary REST operations and Cloudflare D1, with no production or test dependency on an R2 binding. The public application, CMS, independent dashboard, authentication, editorial roles, audit logs, media IDs and `/api/media/:id` references remain in place. Work was performed in the existing checkout without a commit, push, production deployment, secret upload, archive or duplicate project.

Real provider verification is **pending your credentials**. The prepared, Git-ignored `backend/.env` still contains placeholders. Enter its three credential values, then run the local commands in [Cloudinary setup](CLOUDINARY_SETUP.md). All provider operations executed by automated/browser QA were mocked.

## Files changed by this migration

The checkout already contained extensive platform/loading work and continued receiving changes from that task. Those changes were preserved. This manifest identifies migration work rather than attributing the entire Git diff to this task.

| Area                      | Files                                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker and database       | `backend/src/cloudinary.ts`, `backend/src/media.ts`, `backend/src/types.ts`, `backend/src/index.ts`, `backend/src/security.ts`, `backend/src/content.ts`, `backend/migrations/0002_cloudinary.sql`, `backend/wrangler.jsonc`                                                    |
| Setup and migration tools | `backend/.env.example`, prepared ignored `backend/.env`, `backend/scripts/check-env.ts`, `backend/scripts/legacy-media.ts`, `backend/scripts/migrate-media.ts`, `backend/package.json`, root `.gitignore` and `package.json`; obsolete `backend/.dev.vars.example` removed      |
| Existing dashboard        | `admin-dashboard/src/MediaLibrary.tsx`, `FieldEditor.tsx`, `media-upload.ts`, `api.ts`, `copy.ts`, `styles.css`                                                                                                                                                                 |
| Verification              | `tests/platform.integration.ts`, `tests/ui-backend.ts`, `tests/cloudinary.mock.ts`, `tests/cloudinary-migration.test.ts`, `tests/cloudinary.browser-fixture.ts`, `tests/cloudinary.browser-server.ts`, `tests/cloudinary.browser.qa.mjs`, `tests/cloudinary.browser.runner.mjs` |
| Handoff and provider copy | `README.md`, `docs/CLOUDINARY_SETUP.md`, this report, `docs/CLOUDINARY_QA.md`, `docs/CLOUDINARY-MIGRATION-HANDOFF.md`, `docs/DEPLOYMENT.md`, `docs/IMPLEMENTATION.md`, `docs/OPERATIONS.md`, `src/features/legal/PrivacyPage.tsx`                                               |

## Operations and security

Upload uses native Worker fetch/FormData and SHA-256 signatures. The API validates file size, MIME/signature and bilingual alt text. All provider assets use authenticated delivery, including application-public images. Public delivery proxies one eagerly generated optimized WebP; private delivery checks the active owner/editor session before fetching the original with a 60-second signed download. Neither signed provider URLs nor secrets are returned to clients. Unauthorized private GET/HEAD receive 404 before provider access. Stable routes have no-store caching to preserve replacement and visibility security.

The library supports upload progress, processing feedback, decoded previews with retry, Arabic/English alt text, visibility editing, replacement at the same canonical URL, content/revision usage, deletion confirmation and localized failures with retained input. A revision check prevents concurrent replacement from silently overwriting an edit. Published references block privatization; private references block publication. Usage includes draft and published snapshots plus revision history. Audit events cover uploads, edits, replacement, deletion and historical transfer.

Provider operations are journaled before upload. Successful-upload/D1 failures compensate storage; uncertain uploads remain eligible for delayed cleanup. Replacement/deletion journal old assets transactionally, then perform invalidating destroy. Provider failures remain visible as pending cleanup and retry through the hourly scheduler.

Removed: `R2Bucket` and `Env.MEDIA`, all production storage get/put/delete operations, Wrangler bucket bindings, the unused duplicate remote D1 alias, and R2 test bindings/mocks. The one-time historical reader accesses preserved local object metadata and bytes directly, without starting or enabling a bucket. Historical baseline mentions in handoff/validation documents remain explicitly historical.

## D1 and historical data

`0002_cloudinary.sql` is additive. It adds nullable provider asset/public IDs, resource/delivery type, version, format, HTTPS URL and dimensions; revision/update fields; unique provider indexes; and the cleanup journal. Existing IDs, object keys, alt text, visibility, file metadata, creation times and audit history are retained. `0001_platform.sql` is unchanged.

Local inspection found the original 18 content records, one 566-byte WebP and six audit events in an older local identifier while Wrangler targeted an empty configured store. Both stores were preserved. A private ignored backup was saved, the additive local migration was applied, and the original records were imported transactionally into the configured store. Final read-only counts and original media ID/size/creation timestamp match. The older source store and object bytes remain untouched. `media:audit` verifies that the historical file is present. Its actual Cloudinary transfer waits for credentials and verifies original SHA-256 before updating the existing row.

Read-only remote inspection verified account `2bb9190a914533101fb040ac8bf02a4e`, D1 `60063745-f763-4643-aa0d-53911c8c1151`, zero production media rows, R2 not enabled, and no deployed `mashrouak-api` Worker. Only `0002_cloudinary.sql` is pending in the production migration registry. No remote asset transfer is needed for the observed state. No production database mutation was executed.

## Executed checks

| Command / check                                                                                   | Observed result                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck:all`                                                                           | Pass for public app, dashboard and Worker                                                                                                               |
| `npm test`                                                                                        | 10 files, 32 tests pass                                                                                                                                 |
| `npx tsx tests/platform.integration.ts` against the fresh Worker build                            | 142 assertions pass with real isolated D1/workerd and mocked Cloudinary; intentional persistence failure logs one expected server error                 |
| `npm run test:media:browser` and final `npx tsx tests/cloudinary.browser.runner.mjs`              | 26 checks pass; isolated Worker/D1, mocked provider, Arabic/English, light/dark, desktop/phone, private direct access, retry/replacement/usage/deletion |
| `npm run build:all`                                                                               | Public/admin production bundles and Worker production-target dry run pass; existing lazy Three.js bundle size advisory remains                          |
| `npm run lint`                                                                                    | Exit 0; two existing advisory effect/state warnings in admin authentication and inbox                                                                   |
| `npm run media:audit -w @mashrouak/backend`                                                       | One preserved local historical asset; source size/bytes verified                                                                                        |
| Production-target migration list, Wrangler command help, secret ignore checks, `git diff --check` | Correct pending migration and target; dotenv bulk/deploy options supported; real `.env` ignored and `.env.example` allowed; no whitespace errors        |
| `tsx scripts/check-env.ts --required` with the supplied placeholders                              | Expected refusal, before any upload/deploy                                                                                                              |

Screenshots and browser results are in ignored `artifacts/cloudinary-qa/`. Layouts were visually inspected after transitions, including populated phone cards. The reproducible browser command starts and disposes its own isolated API and temporary dashboard server. It does not touch development or production records.

## Remaining manual setup

Enter credentials in the prepared `backend/.env`, run `npm run media:migrate -w @mashrouak/backend`, then `npm run dev:platform`. Perform real public/private upload, signed-out access, replacement and deletion checks. No Cloudinary account-specific quota or live delivery result is claimed before this step.

For production, use the exact backup, pending-migration and deployment commands in [Cloudinary setup](CLOUDINARY_SETUP.md). `npm run deploy -w @mashrouak/backend` validates credentials and deploys code/secrets together to the explicit production target. Later updates use `wrangler secret bulk .env --config wrangler.jsonc --env production` from `backend`. These commands are prepared, not executed.

The existing public Pages host was verified, but the independent admin host, canonical DNS and API routing are not provisioned by this migration. Production defaults target `mashrouak.net` and `admin.mashrouak.net`; alternate confirmed origins can be supplied through documented deploy flags without source edits. Production hosting/routing must be in place before browser rollout checks can pass.
