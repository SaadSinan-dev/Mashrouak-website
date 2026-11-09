# Deployment

Public app, independent dashboard, Worker and D1 keep their existing architecture. Uploaded media now uses Cloudinary; no storage bucket or subscription is required. Start with [Cloudinary setup](CLOUDINARY_SETUP.md) for the prepared `backend/.env`, historical local transfer, verified account IDs and secret workflow.

## Existing resources and first Worker deployment

Read-only discovery on 2026-11-09 verified Cloudflare account `2bb9190a914533101fb040ac8bf02a4e` and D1 `mashrouak-platform` (`60063745-f763-4643-aa0d-53911c8c1151`). The Worker `mashrouak-api` did not yet exist. The existing public Pages project is `mashrouak-net`; no independent Mashrouak dashboard Pages project was found. This task does not provision hosting, DNS, production credentials or administrator accounts.

1. Fill the prepared `backend/.env` with your Cloudinary cloud name, API key and API secret. The deployment script rejects placeholders. Confirm `wrangler whoami` selects the account pinned in the configuration.
2. Export a protected production D1 backup, then apply only pending migrations:

   ```powershell
   cd backend
   npx wrangler d1 export mashrouak-platform --remote --env production --config wrangler.jsonc --output "$env:USERPROFILE\mashrouak-before-cloudinary.sql"
   npx wrangler d1 migrations apply mashrouak-platform --remote --env production --config wrangler.jsonc
   ```

   Existing migrations/records are preserved. `0002_cloudinary.sql` adds provider fields and cleanup tracking; it does not delete media or reset D1. Production contained zero media records at discovery; no historical remote image transfer was needed. Do not rerun seeding or administrator provisioning on an existing populated database merely for this migration. For a genuinely new database, the existing `db:seed` and `admin:create -- --remote` tools remain available.

3. From the repository root, validate and build:

   ```powershell
   npm run typecheck:all
   npm run lint
   npm test
   npm run test:integration
   npm run test:media:browser
   npm run build:all
   ```

4. Deploy code and secrets together when ready:

   ```powershell
   npm run deploy -w @mashrouak/backend
   ```

   This runs `wrangler deploy --env production --secrets-file .env` after validating credentials. The explicit production environment names `mashrouak-api` and the existing D1 binding. `PUBLIC_ORIGIN=https://mashrouak.net`, `ADMIN_ORIGIN=https://admin.mashrouak.net`, `SITE_URL=https://mashrouak.net`, Secure cookies and hourly cleanup are configured. A build is only a dry run; it does not deploy secrets or resources. Later bulk updates use `npx wrangler secret bulk .env --config wrangler.jsonc --env production` **from backend**, and are themselves production changes.

5. Verify on staging before public cutover: health, sign-in, upload, private access signed out and as support, metadata, both visibility directions, replacement at the same canonical URL, publishing, usage-protected deletion and scheduled cleanup. Actual provider verification requires your Cloudinary credentials and has not been claimed by mocked tests.

## Hosting and origins

Public build: `npm ci && npm run build`; output `dist`.

Independent dashboard build: `npm ci && npm run build -w @mashrouak/admin`; output `admin-dashboard/dist`. Use the repository root as the install/build context. Keep the dashboard's authentication and noindex/robots rules.

Use same-site HTTPS production origins. With the configured canonical domains, route `/api/*` on both `mashrouak.net` and `admin.mashrouak.net` to `mashrouak-api`, and leave frontend `VITE_API_URL` empty. Alternatively, host the API under the same parent domain and set `VITE_API_URL` to that API origin in both builds. Cloudinary credentials never belong in frontend variables.

The verified existing `mashrouak-net.pages.dev` address is a different origin from the canonical production configuration. If retaining that host or choosing different frontend origins, supply the actual exact origins as deployment flags; no source edit is required:

```powershell
cd backend
npx tsx scripts/check-env.ts --required
npx wrangler deploy --config wrangler.jsonc --env production --secrets-file .env --var PUBLIC_ORIGIN:https://mashrouak-net.pages.dev --var ADMIN_ORIGIN:https://YOUR-CONFIRMED-ADMIN-HOST --var SITE_URL:https://mashrouak-net.pages.dev
```

Replace the admin-host argument with the host you actually provision. Ensure the browser's API routing remains same-site for Strict cookies. An unrelated `workers.dev` API behind a `pages.dev` frontend does not satisfy that requirement by itself. Secrets alone do not create frontend hosting, API routes or DNS. The prepared canonical-domain command needs those existing hosting operations before browser production checks can pass.

Set public build `VITE_SITE_URL` and dashboard `VITE_PUBLIC_URL` to the actual public origin. The build regenerates CSP headers and SPA fallbacks. Route `/sitemap.xml` to `/api/sitemap.xml` for synchronized published content. Rebuild after HTML changes; do not add secrets to variables beginning `VITE_`.

## Environment reference

| Variable                                                               | Location                                             | Purpose                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `backend/.env` locally; Worker secrets in production | Server-only provider authentication.                                 |
| `CLOUDINARY_FOLDER`                                                    | Same server-only file / Worker secret                | Public ID namespace, default `mashrouak`.                            |
| `PUBLIC_ORIGIN`, `ADMIN_ORIGIN`                                        | Worker configuration / deploy flags                  | Exact permitted frontend origins.                                    |
| `SITE_URL`, `ENVIRONMENT`                                              | Worker configuration / deploy flags                  | Canonical sitemap origin and Secure production cookies.              |
| `VITE_SITE_URL`, `VITE_PUBLIC_URL`, `VITE_API_URL`                     | Frontend builds                                      | Public origin, preview destination, optional same-site API origin.   |
| `CHAT_RETENTION_DAYS`                                                  | Worker                                               | Retention, default 90 days; hourly cron also retries orphan cleanup. |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`                 | Worker; key is a secret                              | Existing optional AI integration, disabled by default.               |

Production `.env` bulk uploads should contain only intended server settings. The supplied file requires the three Cloudinary credential values and retains the default namespace. Existing unrelated secrets are not removed by the additive secret upload.

No production secret upload, schema update, deploy, commit, push or ZIP creation was executed by this migration task.
