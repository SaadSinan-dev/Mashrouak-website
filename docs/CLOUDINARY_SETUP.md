# Cloudinary setup

## Enter credentials and start locally

`backend/.env` is already prepared and ignored by Git. Replace its three placeholder values with the credentials from your Cloudinary account. Keep `CLOUDINARY_FOLDER=mashrouak` unless you want a different folder prefix. Never add `VITE_` to any Cloudinary variable.

1. Create a free [Cloudinary Image and Video account](https://cloudinary.com/users/register_free). In the Console, select the intended product environment, then open Settings → API Keys. Copy **Cloud name**, **API key**, and **API secret** into `backend/.env`.
2. If starting from a fresh checkout, create the file once from the repository root:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```

   Do not overwrite an existing `.env`. The template contains placeholders only:

   ```dotenv
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_FOLDER=mashrouak
   ```

3. Stop local development before transferring historical images. From the repository root:

   ```powershell
   npm ci
   npm run db:migrate -w @mashrouak/backend
   npm run media:audit -w @mashrouak/backend
   npm run media:migrate -w @mashrouak/backend
   npm run dev:platform
   ```

   The migrate command makes real authenticated Cloudinary uploads using your credentials. It runs only when you invoke it with configured credentials. It skips already migrated records, verifies the downloaded original's SHA-256, keeps the same media ID, original object key, filename, MIME type, size, visibility, alt text and creation timestamp, and records an audit event. Missing/ambiguous bytes or provider failure stop the transfer without discarding source records. Original local object files are retained. `updated_at` and `revision` record the migration itself.

4. Open [the dashboard](http://localhost:5174/media). The existing administrator is preserved; a new checkout without an account can use `npm run admin:create -w @mashrouak/backend`. Upload public and private test images, replace one and verify signed-out private access before production rollout.

To run only the Worker:

```powershell
cd backend
npm run dev
```

Wrangler loads `backend/.env` alongside `backend/wrangler.jsonc`; the dev command names that file explicitly. No `.dev.vars` existed at discovery; the obsolete `.dev.vars.example` was removed. The startup check rejects competing `.dev.vars*` files. Use only `backend/.env` for local Worker secrets, then restart the Worker after changing them. Keep optional existing AI configuration in this same server-only file if needed. Public and admin `.env.example` files remain frontend configuration, never Cloudinary secrets.

## Verified account and production target

Read-only checks on **2026-11-09** found:

| Resource                | Verified value / state                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Cloudflare account      | `2bb9190a914533101fb040ac8bf02a4e`                                                                   |
| Worker name             | `mashrouak-api`; no deployed Worker of this name existed                                             |
| D1 database             | `mashrouak-platform` / `60063745-f763-4643-aa0d-53911c8c1151`; preserved                             |
| Production media rows   | `0`                                                                                                  |
| Remote storage          | R2 is not enabled (Cloudflare response `10042`); nothing was enabled or created                      |
| Historical local media  | One 566-byte WebP, ID `4ba615cf-b98b-467f-8a1f-539af897116a`; D1 record and original bytes preserved |
| Existing public hosting | `mashrouak-net.pages.dev`; no Mashrouak admin Pages project existed                                  |

The account is pinned in Wrangler. The explicit `production` environment names **the same** `mashrouak-api` Worker, rather than creating a suffixed Worker, and binds the same existing D1 database. Its configured origins are `https://mashrouak.net` and `https://admin.mashrouak.net`; `ENVIRONMENT=production` enables Secure cookies. These origins are intended production hosting addresses, not a claim that DNS or the dashboard has been deployed. See [deployment](DEPLOYMENT.md) for routing and origin overrides without source edits.

No historical **remote** object migration is required for the observed empty production media table. The local image **does** need the credential-dependent transfer above. If new remote legacy rows appear before rollout, stop and inventory their actual source instead of deleting them or re-enabling storage. The local transfer utility intentionally refuses `--remote`.

## Production commands

Local `.env` values are **not** deployed automatically. Run the following only when you intend to change production, after filling the credentials. Never paste credentials into chat, shell history or a frontend environment file.

From the repository root, validate and build:

```powershell
npm run typecheck:all
npm test
npm run test:integration
npm run test:media:browser
npm run build:all
```

Then, from `backend`:

```powershell
cd backend
npx wrangler whoami
npx wrangler d1 info mashrouak-platform --config wrangler.jsonc --env production
npx wrangler d1 export mashrouak-platform --remote --config wrangler.jsonc --env production --output "$env:USERPROFILE\mashrouak-before-cloudinary.sql"
npx wrangler d1 migrations apply mashrouak-platform --remote --config wrangler.jsonc --env production
npm run deploy
```

Move the SQL backup into your protected backup location. The deployment script validates `.env`, then uses `wrangler deploy --env production --secrets-file .env` to create/update code and credentials together. This handles the verified first-deployment case without a placeholder Worker. It does not print secret values. Existing unrelated production secrets are preserved.

For subsequent credential updates, the verified bulk-secret command is:

```powershell
cd backend
npx wrangler whoami
npx wrangler secret bulk .env --config wrangler.jsonc --env production
npx wrangler secret list --config wrangler.jsonc --env production
```

`secret list` displays names, not values. Bulk secret updates create a production deployment; they are not a local-only operation. Always confirm the account above and Worker `mashrouak-api` before running them. The installed Wrangler **4.158.0** accepts dotenv files for both bulk uploads and `deploy --secrets-file`; command help and production dry-run packaging were verified. No real secret upload or deployment was executed.

References: [Wrangler local environment files](https://developers.cloudflare.com/workers/local-development/environment-variables/), [bulk secrets and deployment options](https://developers.cloudflare.com/workers/wrangler/commands/workers/#secret-bulk).

## Delivery and data safety

All originals **and** derived images use Cloudinary `type=authenticated`, including images marked public in this application. Uploads use signed REST requests, native `fetch`, `FormData` and Web Crypto SHA-256. There is no Node-only provider SDK, unsigned preset, browser API secret or database credential column.

The Worker retains `/api/media/:id`. It reads current D1 visibility on every request. Public requests proxy one eagerly generated WebP derivative, limited to 1920px with automatic quality, through signed Cloudinary HTTPS delivery. Private requests require an active owner/editor session and proxy the unchanged original using a signed download valid for 60 seconds. Private download URLs never reach the browser. These downloads consume more provider bandwidth than CDN delivery, so they are reserved for private originals. Support users and signed-out visitors receive `404` before any provider request; `HEAD` follows the same policy.

Both response types use `private, no-store`, with no redirects or forwarded provider headers. This is deliberate: stable URLs may be replaced or become private. An old immutable public cache must not bypass the next authorization check. Cloudinary still caches the single generated derivative internally. No implementation can revoke bytes already downloaded by a visitor.

Metadata and both alt texts are stored in D1. Replacement creates a fresh provider asset and updates the existing record with an optimistic revision check. It keeps the ID, canonical URL and creation time. Publication of private media is blocked across content types; making an image private while published content references it is blocked. Usage/deletion checks include drafts, published snapshots and revision history.

Migration `0002_cloudinary.sql` only adds nullable provider columns, dimensions, revision/update fields, unique provider indexes and a small cleanup journal. `0001_platform.sql` and existing records are not rewritten. Provider uploads are journaled before the network call. D1 failures compensate successful uploads; uncertain uploads remain queued long enough to catch a late provider completion. Replacement/deletion queue obsolete provider assets transactionally. Failed invalidating destroys retry hourly via the existing Worker scheduler. The response/dashboard reports pending cleanup. No real source object or database was reset.

For local cleanup testing, start Wrangler with `--test-scheduled`, then request its local `/__scheduled?cron=15+*+*+*+*` endpoint. Local development does not run cron automatically. Production cron runs at minute 15 each hour; monitor `media_cleanup` counts and Worker logs. Changing the Cloudinary cloud/account requires a deliberate migration of existing assets, not just replacing the cloud name.

References: [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [authenticated assets, eager transformations and private download bandwidth](https://cloudinary.com/documentation/control_access_to_media).

## Free-plan usage

The public Image and Video API [pricing page](https://cloudinary.com/pricing) lists a Free plan with **25 monthly credits**, three users and one account as checked on 2026-11-09. Credits are shared across transformations, stored assets and delivery usage, not separate unlimited allowances. The exact quota, asset-size limits, reset window and any special restrictions for **your account** must be checked in its Console Usage/Billing screens; no Cloudinary account has been connected or inspected here.

The application bounds original uploads to 5 MB, optimizes browser uploads, and requests one fixed eager image derivative. It uses no paid add-ons, custom delivery domains, token-auth CDN add-ons or paid storage service. Retained originals, derivatives, private downloads, failed-upload cleanup backlogs and delivered bytes still consume quota. Monitor usage before sharing traffic. Exceeding free allowances can restrict service or require a paid plan/charges under your account terms; free storage and bandwidth are not unlimited. Cloudflare Workers and D1 have their own account quotas as well.

## Verification boundary

Automated provider responses are mocked, while D1 and workerd are real isolated local runtimes. Browser QA also uses a disposable database. A provider-specific failure or plan restriction can only be verified after you enter credentials and perform the real smoke checks. See [QA coverage](CLOUDINARY_QA.md) and [migration report](CLOUDINARY_MIGRATION_REPORT.md). No real Cloudinary upload, secret upload, production migration, commit, push, deployment or archive creation was performed by this migration task.
