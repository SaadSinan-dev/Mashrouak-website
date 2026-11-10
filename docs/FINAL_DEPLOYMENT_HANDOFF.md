# Final deployment handoff — 10 November 2026

Use the existing **Render Free Web Service + Neon Free PostgreSQL + Cloudinary**, with independent public and admin Cloudflare Pages applications. This document supersedes previous paid Render/PostgreSQL proposals. No paid resources, DNS changes, push, remote migration or remote import were performed in this pass. The owner chose to handle provider-account steps while local checks continue.

## Current state and deployment order

Source fixes and local regression tests are complete. Actual Neon connectivity and the hosted rollout are **not verified**. The previously exposed Neon password must be rotated before any live check. Never reuse it or paste replacement credentials into chat. Actual Render/Neon regions and the Render service URL were unavailable; no region or hostname is assumed.

1. Rotate the Neon role password and retain protected backups/source files. Configure the fresh direct and pooled URLs; run the read-only connectivity/status check below.
2. After separate explicit approval, apply missing Neon migrations and import the approved populated source. Verify counts/hashes; apply the reviewed Services correction if importing the older D1 snapshot. Do not deploy an empty database.
3. Configure the existing Render service and its environment; configure the two existing Pages projects. Review the complete Git diff before approving a push that triggers deployments.
4. Deploy the reviewed commit, verify Render readiness, then verify both Pages deployments use that commit and the intended proxy settings.
5. Complete the hosted acceptance procedure, including three publications and an idle/wakeup test. Keep local data and backups until the hosted result is accepted.

## Why Render failed and what changed

At commit `9273a7261843dd87895d219b3ecb29a8c053b6de`, `createPostgresPool()` in `backend/src/database.ts` set `Pool.options` to `-c search_path=...` plus session settings. The installed `pg` driver includes this in its startup packet before `assertUtf8()` can run its first query. Neon transaction pooling rejects that setting. Changing the URL alone leaves the code-supplied startup options in place.

The factory now strips URL `options`/`search_path`, rejects inherited `PGOPTIONS`, and sends no such startup options. Direct connections use the installed driver's **awaited** `onConnect` hook. Application queries use one checked-out connection per transaction and await `SET LOCAL search_path`, serializable isolation and timeouts before querying. Transaction pooling does not rely on session settings surviving between transactions. Session `LISTEN` uses the optional direct pool; without it, public revision polling remains available and the stream endpoint returns 204.

`DIRECT_DATABASE_URL` is implemented in runtime and administrative commands. Migrations/import/backup/provisioning require a direct endpoint. Normal runtime can use a Neon `-pooler.` endpoint. Pool size is four per pool; a separate direct pool is also capped at four and holds the publication listener. No asynchronous `pool.on('connect')` race is used.

Remote URLs are normalized to `sslmode=verify-full`; insecure modes are rejected. In installed `pg-connection-string`, this retains normal certificate-chain and hostname verification without the ambiguous `require` warning. No `rejectUnauthorized:false` or custom hostname bypass is introduced. UTF8 validation and schema readiness run before listening. Startup failures are reported by safe error code, without connection URLs/stacks. Render's port is honored on `0.0.0.0`; shutdown closes requests, notification connections and pools.

References: [Neon pooling limitations](https://neon.com/docs/connect/connection-pooling), [awaited pg pool initialization](https://node-postgres.com/apis/pool), [pg TLS handling](https://node-postgres.com/features/ssl).

## Exact environment variable master table

Origins below mean the **actual current HTTPS browser origins**, without paths or trailing slash. Use existing provider hostnames until any separate DNS work is explicitly approved. None of the secret values belong in `VITE_` variables or Git. Existing `backend/.env` remains ignored.

### Render backend — existing service

| Provider | Project/service | Variable | Value/source | Secret? | Required? | Purpose |
|---|---|---|---|---|---|---|
| Render | Existing backend | `DATABASE_URL` | Fresh Neon pooled PostgreSQL URL, correct branch/database/role | Yes | Yes | Runtime database |
| Render | Existing backend | `DIRECT_DATABASE_URL` | Fresh Neon **direct** URL, same branch/database/role | Yes | Recommended runtime; required for pooled-runtime admin commands | LISTEN and administrative access |
| Render | Existing backend | `NODE_VERSION` | `24.19.0` | No | Yes | Render Node selection; package engines also enforce version |
| Render | Existing backend | `NODE_ENV` | `production` | No | Yes | HTTPS origins, secure cookies, no local env loading |
| Render | Existing backend | `PORT` | Render-provided; do not override | No | Provider supplied | Listener binding |
| Render | Existing backend | `PUBLIC_ORIGIN` | Actual public Pages/site HTTPS origin | No | Yes | Exact origin validation and CORS |
| Render | Existing backend | `ADMIN_ORIGIN` | Actual admin Pages/site HTTPS origin | No | Yes | Exact origin validation and CORS |
| Render | Existing backend | `SITE_URL` | Actual canonical public HTTPS origin | No | Yes for production sitemap | Dynamic public URL generation |
| Render | Existing backend | `PAGES_PROXY_SECRET` | One newly generated value, identical on both Pages projects | Yes | Yes for trusted Pages forwarding | Authenticate forwarded client-IP metadata |
| Render | Existing backend | `CLOUDINARY_CLOUD_NAME` | Existing Cloudinary product environment | Public identifier | Yes for media | Media account |
| Render | Existing backend | `CLOUDINARY_API_KEY` | Existing Cloudinary API credential | Server only | Yes for media | Provider API identity |
| Render | Existing backend | `CLOUDINARY_API_SECRET` | Existing Cloudinary secret | Yes | Yes for media | Upload/sign/delete authorization |
| Render | Existing backend | `CLOUDINARY_FOLDER` | Existing folder; default `mashrouak` | No | Optional | New media namespace |
| Render | Existing backend | `CHAT_RETENTION_DAYS` | `90`, unless owner chooses another retention period | No | Optional; default 90 | Persisted cleanup policy |
| Render | Existing backend | `AI_PROVIDER` | `none` | No | Optional; default none | Disable unconfigured AI provider |
| Render | Existing backend | `AI_API_KEY` | Approved provider key | Yes | Only with `openai-compatible` | Optional AI authorization |
| Render | Existing backend | `AI_BASE_URL` | Approved HTTPS compatible API base | No | Only with `openai-compatible` | Optional AI endpoint |
| Render | Existing backend | `AI_MODEL` | Approved provider model name | No | Only with `openai-compatible` | Optional AI selection |

Do not configure `PGOPTIONS` or TLS bypass variables. `ENVIRONMENT` is derived from `NODE_ENV`; it is not another Render setting.

### Public Cloudflare Pages — `mashrouak-net`

| Provider | Project/service | Variable | Value/source | Secret? | Required? | Purpose |
|---|---|---|---|---|---|---|
| Cloudflare Pages | Public | `API_PROXY_URL` | Actual existing Render HTTPS origin, without `/api` | Server binding only | Yes | Pages Function upstream |
| Cloudflare Pages | Public | `PAGES_PROXY_SECRET` | Same exact value as Render and admin Pages | Yes, server binding only | Yes | Trusted forwarding |
| Cloudflare Pages | Public | `NODE_VERSION` | `24.19.0` | No | Yes for build consistency | Build runtime |
| Cloudflare Pages | Public | `VITE_API_URL` | Empty/unset | No | Keep empty | Same-origin `/api`; never insert Render credentials |
| Cloudflare Pages | Public | `VITE_SITE_URL` | Actual canonical public HTTPS origin | No | Yes for intended metadata | Public site URL |
| Cloudflare Pages | Public | `VITE_CONTACT_EMAIL` | Approved public contact email; current code default otherwise | Public | Optional | Contact label |
| Cloudflare Pages | Public | `VITE_WHATSAPP_NUMBER` | Approved public digits; current code default otherwise | Public | Optional | WhatsApp contact |
| Cloudflare Pages | Public | `VITE_CONTACT_API_URL` | Leave empty for integrated backend | Public | Optional | Explicit contact integration override |
| Cloudflare Pages | Public | `VITE_ANALYTICS_ID` | Approved analytics ID or empty | Public | Optional | Existing optional configuration |

### Admin Cloudflare Pages — `mashrouak-admin`

| Provider | Project/service | Variable | Value/source | Secret? | Required? | Purpose |
|---|---|---|---|---|---|---|
| Cloudflare Pages | Admin | `API_PROXY_URL` | Same actual Render HTTPS origin | Server binding only | Yes | Pages Function upstream |
| Cloudflare Pages | Admin | `PAGES_PROXY_SECRET` | Same exact value as Render and public Pages | Yes, server binding only | Yes | Trusted forwarding |
| Cloudflare Pages | Admin | `NODE_VERSION` | `24.19.0` | No | Yes for build consistency | Build runtime |
| Cloudflare Pages | Admin | `VITE_API_URL` | Empty/unset | No | Keep empty | Same-origin authenticated API |
| Cloudflare Pages | Admin | `VITE_PUBLIC_URL` | Actual public Pages/site HTTPS origin | No | Yes | Public links and saved draft preview |

Set bindings separately in **each Pages project → Settings → Variables and Secrets**, for Production. Preview needs equivalent bindings pointing only at its intended backend; do not expose production drafts/data to untrusted preview deployments. Build variables require a rebuild after changes. Both projects use root `functions/api/[[path]].ts`, which reads exactly `API_PROXY_URL` and `PAGES_PROXY_SECRET`.

The admin's bundled public preview also uses the root public configuration; supply the same public metadata/contact overrides only if overriding them on the public project. Optional provisioning variables `PROVISION_EMAIL`, `PROVISION_NAME`, `PROVISION_PASSWORD`, `PROVISION_ROLE` are CLI-only, not hosting requirements. Prefer its hidden password prompt. `TEST_DATABASE_URL` is local-test-only and tests reject remote targets.

### Shared secret generation and Render Environment Group

Generate once in a trusted local PowerShell window. This prints a **new** secret locally for entry into the three provider settings; never paste its output into chat or a tracked file:

```powershell
$proxyBytes = New-Object byte[] 32
$proxyGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$proxyGenerator.GetBytes($proxyBytes)
$proxyGenerator.Dispose()
[Convert]::ToBase64String($proxyBytes)
```

In Render, open **Environment Groups → New Environment Group**, or reuse the owner's existing intended group. Put shared backend secrets there. On the **existing backend service → Environment → Linked Environment Groups → Link**, select that group. Keep service-specific `NODE_ENV`, origins and retention settings on the service if preferred. Avoid the same key in multiple groups or in both the group and service: service values override group values, and multiple-group precedence must not be relied on. Saving/linking may trigger deployment; finish schema/data preparation first. The actual group name/account linkage is not verified here. [Render environment group instructions](https://render.com/docs/configure-environment-variables#environment-groups).

## Copy-ready PowerShell: preserved data and Neon

Run from the repository root. Commands contain no credentials. **Do not execute write commands until separately approving the intended Neon target and source.** Keep the local database configuration available in protected storage so local previews/tests can still use it. Tests deliberately refuse a Neon URL.

Before changing the local `.env` from local PostgreSQL to Neon, preserve the latest local PostgreSQL state:

```powershell
Set-Location 'C:\Users\saads\Desktop\mashrouak.net\Mashrouak.net'
npm run db:backup -w @mashrouak/backend
Get-Item backend/.local/migration/source-local.json, backend/.local/migration/source-local.json.sqlite |
  Select-Object Name, Length, LastWriteTime
```

The backup is a private PostgreSQL JSON recovery artifact, **not** input for `db:import:d1`. The D1 source remains intact. Initial raw-source counts were users 2, sessions 3, content 18, revisions 12, audits 36, conversations 2, messages 6, media 1, rate limits 28, preview tokens 5, cleanup 0. Source manifest SHA-256/counts are checked by the importer. Later Services corrections and normal transient-row expiry explain legitimate local destination differences. Do not substitute the empty remote D1 export. If further real edits occurred in PostgreSQL, stop and approve reconciliation of that newer state before importing the older D1 snapshot.

In **Neon → intended project/branch → Roles**, reset the exposed role password using its reset action. In **Connect**, copy the newly generated pooled and direct connection URLs into protected `backend/.env` as `DATABASE_URL` and `DIRECT_DATABASE_URL`. Use the same branch/database/role; the direct hostname must not contain `-pooler.`. Use fresh values in Render too. A new terminal avoids stale inherited database variables. Do not configure the old password anywhere.

Read-only connectivity, UTF8, public-schema readiness, migration checksum/status and publication revision checks, for **both** configured URLs:

```powershell
npm run db:check -w @mashrouak/backend -- --rotated-credentials
```

Expected: connected/utf8 true for pooled and direct; all four migration names applied after schema preparation. Before initial migrations, schemaReady false/pending is reported separately from connectivity. This script does not apply schema or import data.

**Only after explicit migration approval**, apply additive checksummed migrations over the direct URL. No Free-plan pre-deploy job is assumed:

```powershell
npm run db:migrate -w @mashrouak/backend
npm run db:check -w @mashrouak/backend -- --rotated-credentials
```

After migrations, run the no-write import comparison. It prints counts and refuses a different nonempty destination:

```powershell
npm run db:import:d1 -w @mashrouak/backend -- .local/migration/source-local.json --allow-remote
```

**Only after explicit import approval**, import the reviewed source. All source rows/counts/hashes are verified before commit; relationship failures roll back. Rerun comparison immediately, before other writes/expiry:

```powershell
npm run db:import:d1 -w @mashrouak/backend -- .local/migration/source-local.json --allow-remote --apply
npm run db:import:d1 -w @mashrouak/backend -- .local/migration/source-local.json --allow-remote
npm run db:check -w @mashrouak/backend -- --rotated-credentials
```

The second command should report an exact match. Never truncate/reset/seed to make a comparison pass. The preserved raw D1 snapshot predates the confirmed Services corrections. **With explicit approval for this content write**, run the exact reviewed, revision/audit-producing correction once; it transforms draft and published text independently:

```powershell
npm run content:audit-services -w @mashrouak/backend -- --allow-remote
npm run db:backup -w @mashrouak/backend
```

This correction command writes; its name is not a dry-run flag. After intentional corrections, comparison against the older raw manifest is expected to differ; retain both raw source and new protected backup. Do not provision demo users or seed over the existing imported accounts.

## Exact existing-service settings

| Target | Repository / branch | Root | Build | Output / start |
|---|---|---|---|---|
| Render **existing Free web service** | `SaadSinan-dev/Mashrouak-website` / `main` | Repository root | `npm ci --include=dev && npm run build -w @mashrouak/backend` | `npm run start -w @mashrouak/backend` |
| Pages `mashrouak-net` | Same / `main` | Repository root | `npm run build` | `dist` |
| Pages `mashrouak-admin` | Same / `main` | Repository root | `npm run build -w @mashrouak/admin` | `admin-dashboard/dist` |

In **Render → existing service → Settings**, verify repository, branch, Node, commands, **Free** plan and `/healthz`. Do not create a replacement service or apply a Blueprint that duplicates it. `render.yaml` is validated configuration for comparison; it creates no database/disk/worker/cron resource. No pre-deploy command is present. Copy actual region and service HTTPS URL from this service; compare Neon branch region in its dashboard if investigating latency. No relocation is authorized.

In **Cloudflare → Workers & Pages → each existing project → Settings → Builds & deployments**, compare the table. The real public project is `mashrouak-net`; `mashrouk-net` in one brief subsection is a spelling inconsistency, not a new project to create. The public project's existing leading tab before its build command was previously preserved. Separate outputs include each app's generated security headers and admin `/preview/index.html`.

Pages uses its built-in SPA fallback when no `404.html` exists; the former catch-all `_redirects` rule was rejected by Wrangler as a loop and is removed. `/api/*` is served by the Function and must return JSON errors, never SPA HTML. Static hashed assets retain immutable caching. [Pages SPA serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering).

Before a source push, review `git status --short`, `git diff --stat`, `git diff`, and untracked source/tests/docs. HEAD and fetched origin/main were both `9273a7261843dd87895d219b3ecb29a8c053b6de` at this pass. The dirty checkout contains earlier authorized UI/CMS/device changes as well as this runtime fix. A main push can automatically deploy **all three** applications. No push/deployment was performed here.

## Hosted acceptance after the reviewed rollout

1. In Render deployments/logs, verify the intended new commit, successful build/start, no restart loop, Free plan, and no unsupported startup parameter or unsafe SSL fallback. Read-only check:

   ```powershell
   $renderOrigin = (Read-Host 'Actual existing Render HTTPS origin').TrimEnd('/')
   Invoke-RestMethod "$renderOrigin/healthz"
   ```

   Expected HTTP 200 JSON includes `database: postgresql`. This must be the hosted URL, not localhost. Run the protected `db:check` command for pooled/direct connectivity, UTF8 and applied checksums.

2. Verify each Pages deployment's intended commit and URL separately. Open `/services` directly and refresh; open admin `/visual` directly after login. `/api/public/content` must return published JSON plus a current revision. Inspect Network: no HTML API responses, proxy 502/503, stale revision, wrong Origin or cookie error. Verify public Arabic/English, theme, all six genuine Services, images and links at desktop/mobile widths. Inspect console for uncaught errors. Admin preview must render actual components once.

3. Log in as the existing administrator, reload to verify persistence, inspect actual imported content/history/media, then log out. Anonymous and insufficient-role requests must be denied; private media must remain inaccessible anonymously. Confirm the production session cookie is Secure, HttpOnly, SameSite=Strict, Path=/; no wildcard credentialed CORS. Browser API calls should remain same-origin on each Pages host.

4. With approval to edit live content, save/publish the **same heading three times** with distinguishable approved text. After each publication, record the committed backend receipt and increasing revision, check protected database state, public API, an already-open public tab without refresh, a new private session, and hard refresh. Save a fourth **unpublished** change and prove all anonymous surfaces retain the third publication. Restore genuine approved wording with an explicit publication; retain audit/history. Verify visual preview, conflict handling and both Services languages. No Git push/rebuild/cache clearing between cycles.

5. With approval for provider writes, test a temporary Cloudinary upload, retrieval, replacement, in-use deletion refusal, and safe deletion of the unused test asset. Confirm metadata and private authorization; do not delete real media. Close all public/admin tabs to stop revision polling and let Render Free idle. After at least its configured idle interval, reopen and record wakeup/database recovery, health, login and content requests. The client allows 90 seconds for cold wakeup, without retrying writes. Real cold-start latency and hosted Cloudinary writes remain unverified.

Detailed local commands/results and the honest readiness scorecard are in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md).
