# Platform implementation

## Working checklist

1. [x] Audit the existing public application, assets, routes, content, tests and hosting files.
2. [x] Add shared schemas, persistent backend, authentication, publishing and media storage.
3. [x] Connect the public site to the CMS, results, full-page support and restrained 3D.
4. [x] Build the independent bilingual administration application and support inbox.
5. [x] Run affected security, integration, browser, loading transition and production-build checks. Continue in this checkout; archive/duplicate-project work was explicitly cancelled by the latest directive.

## Audit (9 November 2026)

The existing application is a strict TypeScript React 19 / Vite 8 SPA, with React Router 7, Tailwind 4, Motion, Radix, Zod and locally hosted IBM Plex fonts. Arabic-first preferences, official logos, six services, three explicitly illustrative project studies, nine process stages, bilingual legal content, theme tokens, form validation and route splitting must be retained. There is no backend, database, authentication, upload service or deployment account configuration in the repository. No Cloudflare or GitHub deployment files are present. The untracked `images/` directory belongs to the user and is preserved.

Baseline: TypeScript passes. Oxlint has four existing warnings. Vitest runs 19 tests, with one failing English enquiry label assertion. The floating FAQ widget stores messages only in component state and opens an overlay. Content and portfolio are source-only. There is no Results module. The contact form correctly reports an email draft, but cannot persist enquiries. SEO is client-rendered; direct application routes require a hosting fallback. The homepage repeats several grids and has no actual 3D rendering. Legal/privacy copy needs to describe the new support storage.

## Architecture and migration decision (before implementation)

Keep the public application at the repository root. Add `admin-dashboard/` as an independently built Vite application, `backend/` as an independently deployed Cloudflare Worker, and `shared/` for runtime Zod schemas and domain contracts. Reuse the current design tokens, logos, localization, portfolio artwork and components. No existing hosting integration will be replaced or deployed by development work.

Use Cloudflare D1 for structured data and Cloudinary authenticated assets for media. Wrangler provides persistent local D1. Integration tests run real isolated D1/workerd with mocked Cloudinary; real uploads require server-only credentials in backend/.env. Stable /api/media/:id references, an authorization proxy and an additive migration preserve existing content. See [Cloudinary setup](CLOUDINARY_SETUP.md). Production requires a user-owned Cloudflare account and resource IDs. Optional AI uses a server-only provider adapter; no provider is active by default. Chat uses explicit short polling, with network recovery, rather than claiming WebSocket delivery or operator presence.

Content has independently stored draft and published snapshots, version checks, revisions, an audit trail and explicit publication actions. The public API returns published snapshots only. Existing source content is imported by a repeatable seed command; no fabricated achievements are seeded. Demonstration portfolio material keeps its existing label. Verified results require evidence, methodology and a measurement period; demonstration results always carry a public explanation. Draft results are private.

Admin credentials are provisioned through a terminal command, never public registration or source credentials. Passwords are salted PBKDF2 hashes; opaque sessions are stored as SHA-256 hashes in D1. HttpOnly cookies, origin checks, a required request header, exact-origin CORS, server-side role checks, request limits, database-backed rate limits and safe plain-text rendering protect APIs. Public chat sessions use a separate HttpOnly cookie; visitors cannot enumerate conversations. Media is validated by size, signature and type; private evidence remains authenticated.

## QA inventory

The added global skeleton requirement applies to route chunks, initial CMS requests, navigation, images, chat session/history, authentication, dashboard overview/tables/charts, editors and media. Shared structural compositions replace default content spinners. Background refresh preserves content; errors terminate initial skeletons and expose a retry; empty datasets have separate empty states. QA must delay real requests, force failures, test reduced motion, both languages and themes, and check replacement geometry.

- Published content, draft isolation, preview, revision restoration, concurrent-edit conflicts, project lifecycle and results evidence rules.
- Owner/editor/support authorization, login/logout/session expiry, CSRF/CORS, invalid inputs, upload signatures and usage checks.
- Visitor chat creation, repeat requests, persisted history, cross-visitor isolation, support replies/status/assignment, read acknowledgements and network recovery.
- Every retained public route; Arabic/English, light/dark, 320–1920px layouts, keyboard focus, reduced motion and WebGL fallback; separate dashboard login/editor/inbox/media states.
- Production builds, lint/typecheck/tests, browser console/network, clean archive extraction/install/build and source/secrets exclusion.

See `VALIDATION.md` for executed checks and deployment prerequisites. No production deployment or external AI call is claimed without evidence.
