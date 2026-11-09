# Executed validation — 9 November 2026

## Current checkout

| Check | Observed result |
| --- | --- |
| `npm run typecheck:all` | Public app, independent admin and Worker pass. |
| `npm test` | 10 files / 32 tests pass, including skeleton semantics, correct authentication input shapes, request deduplication, retained refresh data, stale private response rejection, retry and combined cancellation/deadline behavior. |
| `npm run build:all` | Public/admin production bundles and Worker **dry-run** build pass. Security headers are generated. No deployment occurs. |
| `npx tsx tests/platform.integration.ts` after the build | 142 assertions pass against isolated D1/workerd and the concurrent migration’s mocked Cloudinary adapter. No external media provider request is made. A deliberately injected media failure emits a server-error log as expected. |
| `npm run lint` | Exit 0; two advisory effect/state warnings remain in admin authentication and inbox asynchronous initialization. No checks were disabled. |
| `git diff --check` | Pass; no whitespace errors. |

The Three.js scene remains a separate lazy bundle (~566 kB minified / 142 kB gzip). Vite reports its >500 kB advisory. It is not part of the initial route bundle; reduced motion uses the static fallback and the scene renders on demand. No Lighthouse score or physical-device keyboard/GPU result is claimed.

## Critical browser verification

Tests use Chromium and actual local application pages. They gate genuine code/API requests rather than inserting product delays. `tests/loading.browser.mjs` supplies reproducible coordination checks. Evidence is stored in ignored `artifacts/` files.

- **Public and admin completion order:** code-first and data-first at Arabic/light 1440px and English/dark 390px. Both requests start without waiting for the other. Each tested resource has **one initial API call**, the initial wireframe keeps its **same DOM owner**, and no second skeleton appears after readiness. No page errors.
- **Request failure:** initial 503 ends in a localized retry state. Retry loads the portfolio. A later failed background refresh preserves the exact original card DOM node and displays zero page skeletons; retry clears the notice.
- **3D slow loading:** while `ProductScene` is gated, the hero contains one matching wireframe, **zero fallback nodes** and **zero images**. A successful render produces one canvas, zero static nodes and zero initialization skeletons.
- **3D device/failure paths:** successful 390px rendering; unsupported mobile WebGL; deliberately thrown desktop initialization failure. Success uses one canvas; failures use three original static interface nodes and no canvas/skeleton. All cases have zero page errors and no horizontal overflow. Reduced motion was also exercised by the responsive passes.
- **Chat:** a real visitor message survives direct-route refresh after the loading refactor; the 390×844 conversation stays within the viewport with no horizontal overflow. Earlier end-to-end browser QA also confirmed a persisted staff reply and genuine read acknowledgement.

Following the loading refactor, all 13 retained public routes and all 12 dashboard routes were smoke-tested again. Another 39 public combinations passed at English/dark 1440px, Arabic/dark 320px and English/light 430px, with zero page errors. Earlier in this continuous task, 156 public and 96 admin language/theme/screen combinations passed, covering Arabic/English, light/dark, 320–1920px. The new coordination tests specifically exercise both completion orders instead of merely checking screenshots.

Page-specific geometry checks found 0px hero-height changes for portfolio, contact, services, case study and results; legal heading height also matched. Homepage replacement differed by 0.25px, About matched after correcting its link element, and mobile dashboard metrics matched exactly after sharing the real heading and card layout. Unknown or substantially longer CMS copy can still alter natural document height; preview remains necessary.

Earlier real CMS browser checks saved a bilingual draft, displayed a noindex private preview with bold/list formatting, published it and loaded the public route. A disposable WebP upload and image preview also worked against the pre-migration local R2 implementation. These are historical executed checks, not claims about a live Cloudinary account.

## Concurrent media migration boundary

The owner authorized the other migration chat to continue and asked this task to leave its files untouched. Its current media code, migration and Wrangler configuration differ from the original R2 baseline. See `CLOUDINARY-MIGRATION-HANDOFF.md` for the observed boundary. The critical UI checks used an isolated, seeded local D1/R2 Worker runtime so account activation was unnecessary. Later integration tests exercised the current checkout through the other process’s media mock.

Remote media inventory, actual provider delivery, production DNS/cookies and an external AI model are not verified by these local tests. No production rollout, Git reset/clean, commit or push was performed. The earlier generated archive was removed when the user changed the deliverable to direct repository work; no replacement archive or duplicate repository was created.
