# Mashrouak.net — Final Enhancement and Delivery QA

## Implemented in this update

### Startup experience
- Added a static, automatic startup overlay in `index.html`, so it appears before the React bundle and avoids a blank bootstrap screen
- The early preference script selects the Arabic/English logo and Light/Dark variant from the saved language and theme before the app mounts
- Added `AppLoader`, which waits for the first lazy route, local font readiness, and selected logo decoding before fading out the overlay
- Added a six-second safety fallback for an unavailable route chunk and a localized retry action if the module entry script fails
- No click-to-enter control or manual continue action is present
- The supplied archive did not contain the previously reported Arabic manual-entry phrase or a click-to-enter splash component; this update adds the automatic boot loader rather than claiming to remove absent source code

### Visual cleanup
- Deleted the three low-resolution generated 3D WebP assets formerly under `public/images/3d/`
- Removed the homepage/service imports, the hero image preload, and the obsolete image-specific and perspective/3D CSS
- Replaced the hero image with the existing flat CSS interface-card composition
- Replaced service image/scene content with the existing Lucide icon family in flat, theme-aware visual panels
- Preserved official brand logos, fonts, and illustrative portfolio artwork; the portfolio concepts remain explicitly labelled as illustrative rather than released-product screenshots

### Official contact channels
- Email: `mashrouak.net@gmail.com` / `mailto:mashrouak.net@gmail.com`
- WhatsApp: `+963 937 254 833` / `https://wa.me/963937254833`
- Instagram: `https://www.instagram.com/mashrouak_net/`
- Added these links to the Contact page, global footer, and chatbot actions
- Updated chatbot meeting guidance to direct visitors to WhatsApp/email and explain that Google Meet details are confirmed after review
- The chatbot remains a curated bilingual FAQ assistant, not a live AI model; its enquiry form only pre-fills the existing Contact page
- The Contact form opens a prepared email draft by default; it does not claim that a draft has been sent. A real receiving backend still requires `VITE_CONTACT_API_URL`

### Copy and legal content
- Removed unnecessary terminal full stops from localized Arabic/English UI copy, legal paragraph strings, service/project descriptions, and chatbot responses; URL/email/domain punctuation and internal sentence punctuation are retained
- Updated Privacy and Terms contact sections with the owner-confirmed channels
- Kept registered legal entity, physical address, and governing jurisdiction explicitly unverified; no legal identity or jurisdiction was invented
- Added tests for the owner-confirmed contact defaults and terminal punctuation in localized interface strings

### Real photography
- No real external photographs were downloaded or integrated in this update
- No remote image hotlinks were added
- `IMAGE_SOURCE_AUDIT.md` records the removed 3D assets, the status of the existing local imagery, candidate Unsplash CDN references, and the fact that those candidates are not yet license-cleared local assets

## Files changed

- `index.html`
- `src/components/shared/AppLoader.tsx` (new)
- `src/app/providers/AppProviders.tsx`
- `src/app/router.tsx`
- `src/features/home/sections/HeroSection.tsx`
- `src/features/services/ServiceDetail.tsx`
- `src/styles/experience.css`
- `src/styles/globals.css`
- `src/config/site.ts`
- `src/features/contact/ContactPage.tsx`
- `src/components/layout/SiteFooter.tsx`
- `src/components/shared/CompanyChatbot.tsx`
- `src/features/legal/PrivacyPage.tsx`
- `src/features/legal/TermsPage.tsx`
- `src/features/legal/termsContent.ts`
- `src/locales/messages.ts`
- `src/features/about/AboutPage.tsx`
- `src/data/services.ts`
- `src/data/projects.ts`
- `.env.example`
- `README.md`
- `IMAGE_SOURCE_AUDIT.md`
- `tests/siteConfig.test.ts` (new)
- `tests/copyPunctuation.test.ts` (new)

Deleted assets:
- `public/images/3d/hero-digital-ecosystem.webp`
- `public/images/3d/website-product-scene.webp`
- `public/images/3d/commerce-platform.webp`

## Checks actually executed

| Check | Result |
|---|---|
| TypeScript 5.8.3 `transpileModule` syntax pass | 64 TS/TSX source and test files; 0 syntax/transpile diagnostics |
| Arabic/English translation-key parity | 447 keys in each language; 0 missing keys in either direction |
| Terms content count | 38 Arabic sections and 38 English sections |
| Terminal-period scan | No user-facing source string ends with a full stop; one non-user-facing `main.tsx` root-element error message retains its diagnostic punctuation |
| Official contact wiring | Confirmed email, WhatsApp, and Instagram destinations present in shared config, Contact page, footer, and chatbot |
| Removed-screen / 3D source scan | No old manual-entry phrase, removed image path, image wrapper, or perspective/3D transform reference in app source or `index.html` |
| PostCSS parse: `src/styles/globals.css` | Passed |
| PostCSS parse: `src/styles/experience.css` | Passed |
| PostCSS parse: `src/styles/tokens.css` | Passed |
| HTML parser: `index.html` | Passed |
| Package manifest / lockfile | Version and root dependency declarations match |

The TypeScript transpilation check is a syntax check using the globally available TypeScript 5.8.3 runtime. It is not a dependency-backed project typecheck and does not replace `npm run typecheck`.

## Installation, build, lint, tests, and browser verification

- `npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=12000` was attempted but timed out while npm registry requests failed with `EAI_AGAIN`; no dependency tree was installed
- `npm run build` was executed and exited **1** because `vite/client` and `node` type definitions were unavailable
- `npm run typecheck` was executed and exited **1** for the same missing type definitions
- `npm run lint` was executed and exited **127** because `oxlint` was not installed
- `npm run test` was executed and exited **127** because `vitest` was not installed
- Chromium is present, but the headless browser invocation stalled in the container and did not produce a screenshot. No live React browser or responsive screenshot verification is claimed

These are environment/network-blocked checks, not passing results. Re-run `npm ci`, build, lint, typecheck, tests, and a live browser pass in a network-enabled environment before production deployment.

## Owner/legal confirmations still required

- Registered legal entity name and registration details, if applicable
- Country of incorporation and governing law/jurisdiction
- Physical/legal address
- Data controller identity and actual retention period
- Any third-party data processors used after deployment
- Production domain (`VITE_SITE_URL`)
- A receiving API endpoint if enquiries should be submitted directly from the website rather than opened as email drafts

Do not treat the legal pages as final binding legal advice until the owner and legal adviser confirm these items.


## Final archive packaging verification (2026-11-08)

- Created `MASHROUAK-NET-LATEST.zip` from the complete updated project directory
- `unzip -t` reported no compressed-data errors
- Extracted the archive into a separate clean directory and confirmed **103 files** were present
- Confirmed the extracted archive contains the source, public brand assets (including both supplied English logo variants), package manifest/lockfile, README, `IMAGE_SOURCE_AUDIT.md`, this QA report, `.env.example`, and the two new tests
- Compared the extracted tree against the packaged source tree; no file differences were found
- Confirmed that `node_modules`, `dist`, build caches, local logs, `.env` secrets, and `*.tsbuildinfo` files are excluded
- On the clean extraction, the production build exited 1 for missing `vite/client` and `node` types; lint exited 127 because `oxlint` is absent; typecheck exited 1 for missing types; tests exited 127 because `vitest` is absent. These are not passing results
- The clean-extraction `npm ci` attempt timed out during the same npm-registry DNS/network failure (`EAI_AGAIN`) seen in the working directory; no `node_modules` directory was created

The archive is structurally valid and extracts cleanly. A dependency-backed production build and live browser verification remain outstanding due to the environment's registry/network limitation.
