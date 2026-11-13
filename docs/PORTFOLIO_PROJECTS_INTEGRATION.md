# Portfolio projects integration

## Source

The Portfolio admin is the only project editor. It writes Firestore `projects`. The public Portfolio exposes a read-only JSON feed at `https://saad-dev-portfolio.netlify.app/.netlify/functions/public-projects` (or the deployed Portfolio Netlify domain). Its implementation is `portfolio/netlify/functions/public-projects.mjs` in the separate `portfolio-new` repository. It reads through the Portfolio's public Firestore rules, returns only public project fields, and excludes records marked private, draft, archived or unpublished. It returns no Firebase configuration or private metadata.

The response format is `{ "version": 1, "projects": [...] }`. Records include Firestore `id`, bilingual text, category, featured flag, sort order, technology list, HTTPS images, and optional HTTPS live/GitHub links. Legacy image keys resolve to stable image files generated from the Portfolio's existing registry at build time. No project records are copied into Mashrouak.

Mashrouak fetches and validates the feed in `src/features/portfolio/project-feed.ts`. Its home showcase, `/work`, and `/work/:id` all read that data. Every successful response replaces the full list, so creation, edits, and deletion synchronize. Browser local storage retains the last valid response during a later outage; a successful empty response clears old projects. A first-time failure displays a retry state. Old Mashrouak CMS project entries are excluded from public content and editing. Historical database rows remain for preservation but are not used.

## Caching and visibility

- Netlify/CDN caches a successful feed for 60 seconds.
- Mashrouak checks every five minutes and on tab visibility, with one shared request for concurrent sections.
- Changes normally appear within five minutes on an open tab, or roughly six minutes if a request reaches a CDN copy just before it expires. A browser reload does not bypass a fresh five-minute browser cache. Failed refreshes show the last valid list until recovery.
- Firestore public read rules must allow the existing public Portfolio project subscription. The feed uses the same public access, never an admin token or service account. Existing records have no explicit publication switch and are public unless a supported private/unpublished flag is set. The Portfolio public view uses the same filter.

## Deployment

1. Deploy the **public Portfolio** Netlify site from `C:\Users\saads\Desktop\Saad\portfolio-new\portfolio` with `npm run build`, publish `dist`, and include `netlify.toml` so Netlify deploys `netlify/functions/public-projects.mjs`. Retain the existing `VITE_FIREBASE_*` settings. Set `FIREBASE_WEB_API_KEY` for Functions if the browser key has HTTP referrer restrictions. This key is never returned by the feed.
2. Request the feed URL and confirm HTTP 200, `version: 1`, and the expected count. A request with `Origin: https://mashrouak.net` must receive `Access-Control-Allow-Origin: https://mashrouak.net`. For staging origins, set `PUBLIC_PROJECTS_ORIGINS` as a comma-separated list in the Portfolio Netlify site and redeploy.
3. Deploy **Mashrouak public Cloudflare Pages** with `npm run build`, publish `dist`. The build includes the Portfolio origin in its content security policy. The default feed URL is built in; set `VITE_PORTFOLIO_PROJECTS_URL` only if the Portfolio domain changes or for staging, then rebuild.
4. Deploy **Mashrouak admin Cloudflare Pages** with `npm run build -w @mashrouak/admin`, publish `admin-dashboard/dist`. Deploy the **Mashrouak Render API** with `npm run build -w @mashrouak/backend`, start `npm run start -w @mashrouak/backend`. These changes remove and reject the old project editing workflow. Retain all existing database and service settings. No migration or paid service is needed.
5. Open Mashrouak `/work` and a project detail page. Add, edit and delete a temporary project using only the Portfolio admin. Confirm the feed and Mashrouak reflect each change within the cache window.

## Files changed

**Portfolio public repository** (`portfolio-new/portfolio`): `.env.example`, `.gitignore`, `README.md`, `package.json`, `netlify.toml`, `netlify/functions/public-projects.mjs`, `netlify/functions/project-assets.mjs` (generated manifest), `scripts/prepare-project-images.mjs`, `src/services/projects/projectService.js`, and `tests/publicProjects.test.mjs`. `public/project-images/` is generated at build time and ignored by Git. The sibling `portfolio-admin` application was not changed.

**Mashrouak public**:

```text
.env.example
README.md
package.json
scripts/security-headers.mjs
src/app/providers/content-context.ts
src/components/shared/SpecialPageSkeleton.tsx
src/data/projects.ts (removed)
src/features/home/sections/ProjectsSection.tsx
src/features/portfolio/CaseStudyPage.tsx
src/features/portfolio/PortfolioPage.tsx
src/features/portfolio/ProjectFeedStatus.tsx
src/features/portfolio/ProjectShowcaseCard.tsx
src/features/portfolio/project-feed.ts
src/features/portfolio/usePortfolioProjects.ts
src/features/results/ResultsSection.tsx
src/locales/content.ts
src/locales/messages.ts
src/styles/globals.css
```

**Mashrouak admin/API and checks**:

```text
admin-dashboard/src/App.tsx
admin-dashboard/src/VisualEditor.tsx
backend/src/content.ts
backend/src/index.ts
backend/src/seed-content.ts
tests/content.test.ts
tests/localization.test.ts
tests/portfolio-feed.test.ts
tests/portfolio.browser.runner.mjs
docs/PORTFOLIO_PROJECTS_INTEGRATION.md
```

An unrelated pre-existing edit to `URL.TXT` was left untouched.

## Verification and limits

A local read of real Firestore returned 13 public records, all with image URLs. Automated tests cover add/update/delete snapshots, optional fields, private flags, unsafe links, CORS, source failure, normalization, and duplicate IDs. Local builds, type checks, 56 Mashrouak unit tests, 18 Portfolio tests, and desktop/tablet/mobile layout checks pass. Lint reports two existing admin warnings. The PostgreSQL integration suite could not run because no local PostgreSQL URL/service was available; it refuses to use a remote database. The new Netlify function and Mashrouak Pages output still need to be deployed. Historical Mashrouak project rows are retained but no longer shown or editable. Results linked to obsolete project slugs no longer render broken detail links.
