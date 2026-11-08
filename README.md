# Mashrouak.net — Digital Product Studio

A premium bilingual website for **مشروعك.net / Mashrouak.net**, a founder-led digital product and software solutions studio. The application preserves the original brand assets and project architecture while providing Arabic-first RTL and English LTR experiences, persistent light/dark themes, responsive navigation, portfolio case studies, service details, and a validated project enquiry flow.

## Languages and preferences

- Arabic is the default language and uses RTL layout.
- English is available through the language control and uses LTR layout.
- Language selection is persisted in `localStorage` under `mashrouak-language`.
- Light mode is the default; dark mode is available through the theme control.
- Theme selection is persisted in `localStorage` under `mashrouak-theme`.
- An early initialization script applies stored preferences before the React application renders to reduce incorrect-direction and incorrect-theme flashes.
- Translation resources are centrally typed in `src/locales/messages.ts`. Localized service and case-study data is composed in `src/locales/content.ts`.
- No additional i18n dependency is required; the existing React context keeps language and theme state shared across the site.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Install and run

```bash
npm install
npm run dev
```

The Vite development server uses `http://localhost:5173`.

## Available scripts

```bash
npm run dev        # Start the development server
npm run build      # Type-check and create the production build
npm run preview    # Preview the production build
npm run lint       # Run Oxlint
npm run typecheck  # Run TypeScript project checks
npm run test       # Run Vitest tests
npm run test:watch # Run Vitest in watch mode
npm run sitemap    # Generate sitemap after setting the production domain
```

## Visual experience refinements

- The mobile navigation is a direction-aware Radix Dialog drawer. It opens from the inline-start edge (right in Arabic RTL, left in English LTR), locks background scrolling while open, closes on backdrop/Escape/navigation, and uses Radix focus management.
- The separate logo/header row inside the drawer has been removed. A compact close control remains at the drawer's logical top-end edge.
- Drawer navigation uses a consistent Lucide icon set, a restrained active indicator, keyboard focus states, and short staggered entrance motion.
- The mobile menu trigger is a custom two-stroke brand mark that transitions into a close symbol. Its position mirrors with the page direction.
- The homepage hero now uses a lightweight, flat CSS interface composition rather than a generated 3D image. Service details use the existing Lucide service icon system in restrained, theme-aware visual panels.
- The former 3D image scroll transforms and image-only styling have been removed. The process preview retains its direction-aware progress rule and the existing reveal/transition behavior remains available with reduced-motion support.
- The three low-resolution generated 3D WebP assets and their unused references have been deleted. No AI-generated 3D image is used by the current website.

## Technology

- React 19 and TypeScript (strict mode)
- Vite 8 and Tailwind CSS 4
- React Router 7
- Radix UI Dialog and Accordion primitives
- Motion for React, with reduced-motion support
- Lucide React icons
- React Hook Form and Zod
- Sonner notifications
- clsx, tailwind-merge, and class-variance-authority
- Vitest

## Project structure

```text
src/
  app/                 # Application shell, routing, providers, error boundary
  components/
    layout/            # Header, desktop navigation, mobile menu, footer
    shared/            # Brand logo, preference controls, cards, CTA, reveals
    ui/                # Buttons, containers, headings, accordion
  config/              # Site and navigation configuration
  data/                # Source service, project, and FAQ content
  features/
    home/              # Homepage and editorial sections
    services/          # Services overview and service details
    portfolio/         # Portfolio, case studies, illustrative galleries
    about/             # Studio philosophy and working principles
    process/           # Nine-stage client project journey
    contact/            # Project enquiry form and schema
    legal/              # Privacy page
    not-found/          # 404 page
  lib/                 # SEO, contact adapter, and shared utilities
  locales/              # Typed Arabic/English messages and localized content
  styles/               # Brand tokens and global responsive/theme styles
  types/                # Shared domain types
public/
  brand/                # Official SVG brand assets
  fonts/                # IBM Plex font files and OFL licenses
  robots.txt
  sitemap.xml
tests/                  # Content, contact, schema, and localization tests
scripts/                # Sitemap generator
docs/brand/             # Brand reference notes and design tokens
```

## Brand system

The official logo artwork remains in `public/brand/` and is used directly rather than redrawn. The wordmark is an SVG asset to preserve its approved Arabic/Latin composition. The website's core palette is:

| Token | Value |
|---|---|
| Deep Petrol | `#142B3A` |
| Teal | `#0B625D` |
| Warm Ivory | `#F6F4EE` |
| Soft Mist | `#E9EFEC` |
| White | `#FFFFFF` |
| Steel Gray | `#56636B` |

Arabic uses the bundled IBM Plex Sans Arabic fonts; English uses the bundled IBM Plex Sans variable font. Dark mode uses a separate semantic palette based on Deep Petrol and muted Teal rather than a simple color inversion.

## Configuration

Copy the example environment file before configuring production values:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `VITE_SITE_URL` | Approved production origin; enables canonical URLs and absolute sitemap entries |
| `VITE_CONTACT_API_URL` | A real server endpoint for project enquiry POST requests |
| `VITE_CONTACT_EMAIL` | Optional override; defaults to the owner-confirmed `mashrouak.net@gmail.com` |
| `VITE_WHATSAPP_NUMBER` | Optional override; defaults to the owner-confirmed Syria number `963937254833`, digits only |
| `VITE_ANALYTICS_ID` | Optional analytics identifier; analytics remain disabled unless a real integration is configured |

Never place private API keys or secrets in `VITE_*` variables. They are exposed to the browser.

## Contact form integration

The form uses React Hook Form and a language-aware Zod schema. Submission behavior is intentionally honest:

1. If `VITE_CONTACT_API_URL` is configured, the form sends a JSON `POST` request and reports success only after an HTTP success response.
2. Otherwise, the site opens a prepared email using the owner-confirmed default address (or the optional `VITE_CONTACT_EMAIL` override). The visitor must send it from their email client.
3. If the email is intentionally cleared in a future code/configuration change, a configured WhatsApp number can be used as a fallback. The visitor must send it in WhatsApp.
4. If no channel is configured, the form explains that the request was not sent.

The owner-confirmed public channels are included by default: `mashrouak.net@gmail.com`, WhatsApp `+963 937 254 833` (`https://wa.me/963937254833`), and Instagram `https://www.instagram.com/mashrouak_net/`. No physical address, registered legal entity, jurisdiction, or receiving API endpoint has been supplied. The receiving backend, if later configured, must handle server-side validation, spam protection, retention, and any privacy notices required for the actual service.

### POST payload

```json
{
  "fullName": "Full name",
  "businessName": "Business name or empty string",
  "email": "name@example.com",
  "serviceType": "websites",
  "projectDescription": "Project description",
  "budget": "Optional",
  "timeline": "Optional",
  "additionalDetails": "Optional"
}
```

## SEO and deployment

- Each route updates its page title, description, robots directive, Open Graph metadata, and structured Organization data in the active language.
- Canonical URLs are emitted only after `VITE_SITE_URL` is configured.
- `public/robots.txt` is included.
- `public/sitemap.xml` remains minimal until the real domain is approved. Run `npm run sitemap` after setting `VITE_SITE_URL`.
- Deploy the generated `dist/` directory to static hosting configured to serve `index.html` for application routes so React Router direct navigation and refreshes work.

## Portfolio integrity

Syrian Menu, Pet Corner, and Mashwarak remain in the portfolio. Their interface artwork is explicitly identified as illustrative concept material based on the available project descriptions, not verified screenshots from released products. No testimonials, customer counts, performance statistics, revenue claims, or client logos have been invented.

## Quality checks

Run these commands before deployment:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

The test suite covers source content integrity, the enquiry URL builders, Arabic/English form validation, translation-key parity, and localized service and project content.

### Latest workspace verification (2026-11-08)

- `npm ci` was attempted with the included lockfile, but npm registry DNS resolution returned `EAI_AGAIN`; dependencies could not be downloaded in this environment.
- Global TypeScript 5.8.3 transpilation checked **64 TS/TSX source and test files** with **0 syntax/transpile diagnostics**. This is a syntax check, not a project typecheck using the lockfile's TypeScript version.
- The globally available PostCSS parser successfully parsed `globals.css`, `experience.css`, and `tokens.css`.
- Static source scans found no remaining application references to the removed 3D image files, image wrappers, perspective transforms, or the previous manual-entry screen. The 3D image directory and files are absent from the project.
- Arabic and English translation keys match at 447 each, both Terms pages contain 38 sections, and contact destinations and links were checked in source. No live React browser session was available because the app dependencies could not be installed; Chromium headless did not complete in this container.
- `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run test` are **not verified as passing**. Run them after `npm ci` succeeds in a network-enabled environment, then perform a live browser pass before production release.

## November 2026 enhancement pass

- The `/process` Work Journey page keeps its existing route, hero, timeline and visual system; the detailed timeline now contains nine stages in Arabic and English, beginning with an introductory Google Meet consultation.
- `/terms` provides 38 substantive bilingual Terms and Conditions sections. Legal entity, governing jurisdiction, legal contact details, project-specific commercial terms, and other owner-confirmed facts are deliberately not fabricated; the terms page flags the need for owner/legal review.
- `/privacy` describes the currently visible contact form, configured submission channels, local language/theme preferences, and the fact that analytics are disabled by default. Any future backend, analytics, cookie, retention, or provider changes require a corresponding policy update.
- The footer contains a dynamically calculated copyright year and links to Terms and Privacy.
- The English navbar logo is taken from the two supplied logo images (color version for light theme and ivory version for dark theme). The images are cropped from the supplied black-canvas artwork and the black canvas is converted to transparency; the logo artwork itself is retained.
- `SmartImage` provides dimension-preserving image skeletons and a finite fallback state; route-level lazy loading now uses destination-aware skeleton layouts for portfolio, service, case-study, contact, process, and legal routes.
- A branded floating FAQ assistant provides curated bilingual answers and real links to Services, Work, and Contact. Its optional project-enquiry form collects a name, email, service type, brief, and preferred contact method, then pre-fills the existing Contact form through transient router state; it does not claim to submit the enquiry. It is explicitly not represented as a live AI model; no backend or API key was supplied.
- The three generated 3D WebP assets were removed because their source dimensions were below the requested quality targets. They are not upscaled or hotlinked. No external real photographs have been integrated; the candidate research and licensing notes are retained in `IMAGE_SOURCE_AUDIT.md`.

### Owner confirmation before legal publication

Confirm the registered legal name, country/jurisdiction, official legal contact, applicable governing law, actual data controller identity, actual retention period, and any third-party processors before treating the legal pages as final legal advice or binding terms. The site currently has no verified registered legal entity, physical address, or governing jurisdiction configured. The owner-confirmed public contact channels are now published on the Contact page.


### Verification status for this package

See `ENHANCEMENT_QA.md` for the latest source checks, actual command results, and outstanding environment limitations. Dependency-backed build, lint, typecheck, tests, and live browser verification are not certified until `npm ci` succeeds.


The chatbot's meeting response now directs visitors to the confirmed WhatsApp and email channels. Its contact actions open the official WhatsApp, email, and Instagram destinations; its project enquiry form still only pre-fills the existing Contact form and does not claim to submit or persist the enquiry. The FAQ assistant remains a curated rule-based assistant and is explicitly not represented as live AI.


## November 8, 2026 — startup, visual cleanup, and official contact update

- Added a static, brand-aware startup overlay in `index.html`. It selects the Arabic or English logo and Light/Dark variant before the React bundle loads, then `AppLoader` releases it after the initial route, local fonts, and logo are ready. A six-second route safety fallback prevents a failed lazy route from trapping the visitor; a module-entry failure exposes a localized retry action. No click-to-enter interaction is part of the loader.
- The supplied archive did not contain the previous manual-entry message or a click-to-enter splash component. The new loader therefore replaces the initial blank/bootstrap experience in this source package; it does not claim to remove code that was absent from the supplied archive.
- Removed `public/images/3d/hero-digital-ecosystem.webp`, `website-product-scene.webp`, and `commerce-platform.webp`, along with their imports/references, image-specific CSS, and the obsolete preload. The hero now uses the existing flat CSS interface-card composition; service details use flat Lucide icon panels. Real project artwork, official brand assets, and fonts remain.
- Confirmed public contact defaults are WhatsApp `+963 937 254 833` / `https://wa.me/963937254833`, email `mashrouak.net@gmail.com` / `mailto:mashrouak.net@gmail.com`, and Instagram `https://www.instagram.com/mashrouak_net/`. Contact page, footer, and chatbot now link to these destinations. The form still opens a prepared email draft unless a real API endpoint is configured; it does not claim the draft was sent.
- Updated the privacy and terms contact sections with the supplied channels while retaining the unverified legal-entity/address/jurisdiction warning. No registered company identity or physical address was invented.
- Removed unnecessary terminal full stops from bilingual UI copy, legal paragraphs, project/service descriptions, and chatbot responses while preserving punctuation inside URLs, email addresses, and numeric values.
- Real-photo status remains unchanged: no Unsplash photograph was downloaded or installed. `IMAGE_SOURCE_AUDIT.md` records the three removed images, candidate URLs, licensing caveats, and the fact that no real-photo asset is currently bundled.

### Verification for this update

- `npm ci` was attempted from the included lockfile but could not complete because the npm registry lookup returned `EAI_AGAIN` (DNS/network unavailable in this environment). No dependencies were installed.
- As a result, the project's `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run test` scripts could not be executed successfully in this environment. Do not treat them as passing.
- Source syntax, CSS parsing, static contact-link checks, 3D-reference scans, ZIP extraction, and archive integrity checks are recorded in the final delivery report only to the extent they were actually run.


## Latest archive delivery

The latest source package is delivered as `MASHROUAK-NET-LATEST.zip`. The archive was integrity-checked and extracted into a clean directory; all 103 packaged files matched the source tree. Dependency installation and the npm build/lint/typecheck/test scripts remain blocked by npm registry DNS/network failures in the build environment. See `ENHANCEMENT_QA.md` for exact command results and the remaining production verification steps.
