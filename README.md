# Mashrouak.net

Arabic-first public website, independent admin application, and a native Node.js/Hono API backed by PostgreSQL and Cloudinary. The official logos, six service offerings and illustrative project labels are preserved.

## Current state

Local publishing is dynamic: saving keeps a private draft; publishing commits a new authoritative snapshot and revision. The public app receives publication notifications and revalidates safely. The Visual Website Editor reuses the actual public routes inside a protected, same-origin preview.

The existing Git-connected Pages project is `mashrouak-net`. The separate Git-connected `mashrouak-admin` project is configured with its own build and output; it has no deployment yet. Render provisioning, Git push and production DNS/data cutover remain pending approval. Read [the Arabic deployment guide](DEPLOYMENT-GUIDE.txt), [implementation and QA](docs/PRODUCTION_UPGRADE_REPORT.md), and [publishing investigation](docs/PUBLISHING_ROOT_CAUSE.md).

## Local development

Requires Node.js 24.19+, npm 10+, and a reachable UTF8 PostgreSQL database. This workspace already has a local PostgreSQL 18 database and preserved imported data. A fresh machine must provide PostgreSQL and set `DATABASE_URL`; the app does not emulate it with D1.

1. Run `npm ci`. Prepare `backend/.env` from its template only if it does not already exist. Preserve existing credentials. Configure PostgreSQL and the three Cloudinary credentials there.
2. For existing D1 data, export and import it **before seeding** using the deployment guide. For a new empty database, run `npm run setup:local`. Migrations are additive and seeding does not overwrite existing content.
3. If a new installation has no administrator, run `npm run admin:create -w @mashrouak/backend`. It prompts for a hidden password and preserves existing accounts.
4. Run `npm run dev:platform`. Open the [website](http://localhost:5173), [dashboard](http://localhost:5174), or [visual editor](http://localhost:5174/visual). The API runs on port 8787.

Use `localhost` for both frontends to match the configured origins. PostgreSQL must be running before the API starts. Runtime files, real environment files and private backups are ignored by Git.

## Validation

```powershell
npm run test
npm run typecheck:all
npm run test:integration
npm run test:publishing
npm run test:publishing:browser
npm run test:visual:browser
npm run test:media:browser
npm run test:devices:browser
npm run build:all
```

Integration tests use real local PostgreSQL in disposable schemas and refuse remote targets. Media regression tests mock Cloudinary; separate live-provider verification is documented explicitly. Device browser checks require the public development server on port 5173.

## Three independent deployment outputs

| Application | Root | Build | Output / start |
|---|---|---|---|
| Existing public Pages | Repository root | `npm run build` | `dist` |
| Independent admin Pages | Repository root | `npm run build -w @mashrouak/admin` | `admin-dashboard/dist` |
| Render Node API | Repository root | `npm ci --include=dev && npm run build -w @mashrouak/backend` | `npm run start -w @mashrouak/backend` |

`render.yaml` is a validated paid deployment proposal, not an already provisioned service. PostgreSQL migrations run through the Render pre-deploy command. The lightweight Pages `/api` proxy forwards to that native service and preserves same-origin authentication; it does not replace either Pages project with a Worker backend.

## Data and media

D1 remains an intact migration source. PostgreSQL import verifies counts and hashes transactionally and refuses to overwrite a different nonempty destination. `npm run db:backup -w @mashrouak/backend` creates a consistent private PostgreSQL JSON backup; use Render logical backups/PITR as well.

Cloudinary credentials remain server-only. Public image bytes support conditional revalidation after metadata checks; private evidence is authenticated and never publicly cached. Original media IDs and references are retained. See [Cloudinary setup](docs/CLOUDINARY_SETUP.md).
