# Operations and recovery

**Current runtime — 10 November 2026:** existing Render Free Node.js/Hono, Neon Free UTF8 PostgreSQL and Cloudinary. The exact current workflow is [FINAL_DEPLOYMENT_HANDOFF.md](FINAL_DEPLOYMENT_HANDOFF.md); actual verification is in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md). D1 remains an intact migration source. `npm run db:backup -w @mashrouak/backend` creates a consistent private PostgreSQL JSON backup over the direct endpoint. Preserve it and original sources; no paid PITR feature is assumed. Imports verify source counts/hashes transactionally and refuse different nonempty targets. Dry runs perform no migration/import. Never reset or seed over existing records.

Publication snapshots, routes, order, audit, revision and notification commit together. The dashboard verifies the public snapshot. Undo/redo changes only document data; server version metadata stays authoritative. Visual publication scope is reviewed explicitly. Preview tokens are hashed, expire after 15 minutes and preserve the selected language/theme.

Cleanup now runs in the native service: a minute timer checks hourly eligibility, a PostgreSQL advisory lock prevents duplicate replicas, and the last success is persisted for restart catch-up. It expires sessions/previews/rate limits, enforces conversation retention and retries provider cleanup. No Worker cron is required. Production cookies remain HttpOnly/Secure/Strict, and the same-origin Pages proxy preserves authentication without third-party cookies. Static hashed assets remain immutable; public image bytes revalidate with ETags after metadata checks, and private bytes remain no-store.

## Historical Worker operations — superseded runtime commands

## Access

Owner manages users, access and audits. Editor manages CMS/media. Support manages conversations. The API enforces these permissions independently of navigation. There is no public registration. Provision the first owner from a trusted terminal; use separate named accounts afterwards. Password changes revoke all that user’s sessions. Disabled users cannot authenticate.

Passwords use salted PBKDF2-SHA256 (100,000 iterations supported by the Worker runtime). Opaque admin sessions expire after eight hours; only their SHA-256 hashes are stored in D1. Visitor cookies last 30 days and identify a private browser conversation. Cookies are HttpOnly, Strict SameSite and Secure in production. State-changing API requests require the application request header and pass exact-origin checks. Authentication, chat, enquiries, uploads and sensitive operations have database-backed limits. Request bodies are bounded, SQL uses bound parameters, and rendered text is escaped.

## Backups

Before changing schema or production content, export a backup to a protected directory outside the repository:

```sh
npm exec -w @mashrouak/backend -- wrangler d1 export mashrouak-platform --remote --output /secure/location/mashrouak-backup.sql
```

SQL exports contain private conversations and password hashes. Restrict access, encrypt stored backups, define expiry, and exclude them from Git, source archives and public object storage. Keep Cloudinary originals and their asset identifiers backed up separately; a D1 export contains references, not image bytes. Provider backup availability depends on the selected plan. Preserve the historical local object files until the credential-dependent transfer is verified. See [Cloudinary setup](CLOUDINARY_SETUP.md). Record resource IDs, migration versions and the release checksum with each backup.

Restore a backup into a **new staging D1 database**, configure a staging Worker and a separate Cloudinary product environment, then verify content counts, published snapshots, private access, sessions, previews and chat history. Revoke copied sessions and preview tokens before allowing access. Use `wrangler d1 execute <staging-database-name> --remote --file <protected-backup.sql>` against that new database. Check the selected account/database before executing. Promote the verified database binding through a reviewed configuration change. Do not overwrite a live database as a routine restore test.

Cloudflare D1 recovery facilities may also be available in your account. Set a backup schedule appropriate to actual traffic and recovery needs; no external backup schedule or offsite copy has been created by this source delivery.

## Conversations

The hourly cron retries journaled Cloudinary cleanup and removes conversations whose last update is older than the configured retention period. Cascade deletion removes their messages. It also expires sessions, previews and rate-limit records, and marks stale AI jobs as failed. Local development requires explicitly triggering the scheduled event; production cron must be enabled and monitored.

For an authenticated deletion/access request, identify the relevant conversation using its ID and verified request details. Export only that conversation if authorized. If deleting through database tooling, use a bound statement scoped to its exact ID and verify the selected account first. Backups may retain data until their own documented expiry. Never provide a visitor with another person’s messages or expose database exports through chat.

Current history responses contain the latest 300 messages; older messages remain in D1 for authorized retrieval within retention. Polling is used rather than a presence or typing simulation. Availability, push notifications, email delivery and file attachments are not claimed by the current text support service.

## Release checks

Run type checks, unit tests, isolated backend integration tests and production builds. Review both languages/themes at mobile and desktop widths. On staging, verify direct-route refresh, cookie security, CORS, two-visitor isolation, upload signatures, private media, draft isolation, preview expiry and CSP. Check the generated sitemap and update operator/legal/provider details using real information before launch.
