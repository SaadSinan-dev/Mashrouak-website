# Neon startup 42P01 — read-only diagnosis

Date: 10 November 2026, Asia/Riyadh. Repository inspected: `e077bf5dc9cd2141c6b8ebf9ebf20414c01d4080` (`main`, Final5 commit). Tracked checkout was clean at the start of this diagnosis. No application source, migration, environment value or provider deployment was changed.

## Exact failing query and relation

`backend/src/server.ts:70–72`, at module initialization before `serve()`:

```sql
SELECT revision FROM publication_state WHERE id=1
```

Call path: `PostgresStatement.first()` → `.all()` → `PostgresDatabase.execute()` → `atomic()` → query on the checked-out client. `beginTransaction()` sets the local search path to `public` before the query. The error logger is `PostgresDatabase.execute()` in `backend/src/database.ts`; it emits `Database query failed { code: '42P01' }`. The production entry wrapper catches the startup rejection. `/healthz` also depends on the same relation, but the module-level check is reached before the HTTP listener starts.

**Missing relation: `public.publication_state`.** The exact query was reproduced in an explicitly read-only transaction through both configured URLs and returned **42P01**. PostgreSQL defines this SQLSTATE as `undefined_table`. [Official error codes](https://www.postgresql.org/docs/18/errcodes-appendix.html).

## Actual live read-only results

Credentials were read only from the ignored local `backend/.env`/process environment. No URL, password or secret was printed or saved in the diagnostic report. The owner added the direct URL during diagnosis. The two configured URLs were compared in memory without printing them.

| Property | Pooled `DATABASE_URL` | Direct `DIRECT_DATABASE_URL` |
|---|---|---|
| Live authentication/query via Neon HTTPS SQL | Passed | Passed |
| Neon project ID reported by PostgreSQL | `late-voice-15445384` | Same |
| Neon branch ID reported by PostgreSQL | `br-divine-fog-bepxduey` | Same |
| Neon endpoint ID reported by PostgreSQL | `ep-orange-frog-beki8l90` | Same |
| Actual database | `neondb` | `neondb` |
| Server encoding | `UTF8` | `UTF8` |
| Default search path | `"$user", public` | Same |
| Default effective schema | `public` | `public` |
| Application-equivalent `SET LOCAL` search path | `public` | `public` |
| Effective application schema | `public` | `public` |
| Transaction read-only | `on` | `on` |
| Non-system schemas | `public`, USAGE allowed | Same |
| Non-system tables/partitioned tables/views/materialized views/foreign tables | None | None |
| `public.publication_state` | Absent | Absent |
| `public.schema_migrations` ledger | Absent | Absent |
| Applied migration rows/checksums | None | None |
| Startup query reproduction | `42P01`, `publication_state` | Same |

Canonical endpoint, database, role, port and credentials matched in memory; pooled/direct modes were correct. Independently returned project/branch/endpoint IDs prove both locally supplied URLs reach the same live Neon target. [Neon documents the pooled/direct hostname relationship](https://github.com/neondatabase/website/blob/main/content/docs/connect/connection-pooling.md). Render's private Environment Group was not read or modified; the check verifies the fresh local URLs supplied by the owner, not an independent comparison of Render's secret values.

**Conclusion:** the intended checked Neon database has no application schema migrations applied. This is not a mismatch between these two URLs, an encoding issue, or a relation hidden in another application schema. The required public schema is accessible, but its application tables and migration ledger do not exist. There is no evidence of lost application records in this target; the source data is still preserved locally. The two URLs cannot by themselves prove whether a different, separately intended historical branch should have been selected; their actual IDs are recorded above for owner comparison.

## Existing protected CLI: exact behavior and limitation

Inspected `backend/scripts/check-database.ts` and `backend/package.json` before execution. The existing command is:

```powershell
npm run db:check -w @mashrouak/backend -- --rotated-credentials
```

The script has **no CLI help handler**. There is no implemented `--help`, `--read-only`, `--status` or `--dry-run` mode to recommend. The implemented remote acknowledgement flag is `--rotated-credentials`. Passing `--help` would not display help or stop execution; the script would proceed toward its connection logic. It was therefore inspected rather than invoked as if it were a help command.

The existing command was executed before and after the direct URL became available. Actual installed `pg`/TCP results were resets/timeouts: pooled returned `ECONNRESET` or the script's sanitized `connection_or_schema_error`; direct returned `ECONNRESET`. A separate bounded native `pg.Client` probe timed out on both URLs. DNS and bare TCP opening succeeded, but an unauthenticated PostgreSQL SSLRequest did not receive a response within eight seconds. This does not identify which network component is responsible and does not prove an authentication/schema failure.

To obtain the requested live schema facts despite this local transport failure, a one-off **official `@neondatabase/serverless@1.2.0`** driver was installed under ignored `artifacts/neon-readonly-runtime`, without modifying project dependencies/lockfiles or executing install scripts. It queried the configured Neon endpoints over HTTPS with certificate verification enabled, using `readOnly:true` transactions. Catalog SELECTs, explicit local-only search-path settings and the exact startup SELECT were the only SQL executed. No migrations, import locks, application data changes or correction scripts ran. HTTPS results above **do not claim that the application `pg` transport is working from this Windows machine**.

Sanitized detailed evidence: ignored `artifacts/neon-readonly-diagnosis.json`; exact bounded read-only probe: `node artifacts/neon-readonly-diagnosis.mjs`. No production runtime driver was replaced.

## Every pending migration, reviewed

No ledger exists; therefore all four repository migrations are pending, and **no applied checksum can be compared**. Expected SHA-256 checksums below were computed from the actual current SQL files, using the same algorithm as the migration runner.

| Pending migration | Reviewed operations | Expected SHA-256 |
|---|---|---|
| `0001_platform.sql` | Creates application tables/indexes, including `publication_state` at line 19; inserts its singleton row at line 20; creates `scheduled_jobs`. **This is the migration that creates the missing relation.** | `1d0b6b19699c22e64b35b9e11232429044d22cd553e8b17016ec4a9158035ce7` |
| `0002_published_routing.sql` | Adds `published_slug` and `published_sort_order` to content; backfills those columns from the existing published rows. | `c4c826c2a749009cc0a8d446f6224f45791f4d4dd9806e503479d28179426f97` |
| `0003_visual_previews.sql` | Creates `preview_snapshots` with its foreign key and expiry index. | `f3a8770d987a4646b54c97e01d9b50831bc7a5c487c3f3cc91d45a1cbbcfdb04` |
| `0004_public_routes.sql` | Creates the partial unique index protecting published content routes. | `f2801b068a6c6c9b1ae8a1f45350a894cd6ce804545dec1951fc1942eb063736` |

None contains DROP, TRUNCATE, DELETE or a reset. Migration 0002 intentionally updates routing columns; 0001 inserts the required publication-state row. These are real writes requiring approval. A conflicting populated schema or duplicate published routes must cause a failure, not an automatic cleanup.

`backend/scripts/migrate-postgres.ts` selects `administrativeDatabaseUrl()`, preferring `DIRECT_DATABASE_URL`. `migratePostgres()` rejects a pooled endpoint, verifies UTF8, uses a direct session advisory lock, creates the migration ledger, checks existing checksums, and applies each pending SQL file transactionally in order. **Startup does not run this migration function**, and the Free Render configuration has no pre-deploy job. Merely supplying both environment URLs does not initialize the schema.

## Commands prepared for approval — NOT executed

Use a fresh trusted PowerShell terminal at the repository root, with the newly rotated URLs stored privately in ignored `backend/.env`. No stale inherited DATABASE_URL/DIRECT_DATABASE_URL should override the intended file. The migration script loads that file when the terminal's NODE_ENV is not production; use a normal local terminal, not the hosted service environment. Its helper selects the direct URL automatically; do not manually copy secrets into a command.

First ensure the existing native driver check works on the chosen trusted network/machine. This local Windows session currently has the pg/TCP limitation described above. Do not weaken TLS or run a migration over an unreviewed replacement transport.

```powershell
Set-Location 'C:\Users\saads\Desktop\mashrouak.net\Mashrouak.net'
npm run db:check -w @mashrouak/backend -- --rotated-credentials
```

**The exact write command requiring the owner's explicit approval is:**

```powershell
npm run db:migrate -w @mashrouak/backend
```

After approved successful execution, verify both URLs and every applied checksum:

```powershell
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop before any import.' }
npm run db:check -w @mashrouak/backend -- --rotated-credentials
```

Expected after migration: both connected/UTF8, `schemaReady:true`, all four names `applied`, no checksum mismatch. Before importing or making other changes, optionally rerun the prepared HTTPS read-only catalog probe to verify current relations and the startup SELECT independently. If native connectivity still fails, the CLI has not verified status; do not report success based on an exit/HTML assumption.

## Prepared data dry run — NOT executed against Neon

The existing importer requires the application tables, so its target comparison cannot succeed before approved migrations. The existing command supports `--allow-remote` and `--apply`; **absence of `--apply` is the no-write dry run**. No invented `--dry-run` flag is used.

After migrations and status verification, the prepared comparison command is:

```powershell
npm run db:import:d1 -w @mashrouak/backend -- .local/migration/source-local.json --allow-remote
```

Do not append `--apply`. Do not seed, correct Services data or provision/replace existing users as part of this diagnosis. Even the existing no-write importer takes transaction/advisory/exclusive table locks and rolls back; it was **not** run here. It refuses a different nonempty destination and exact identical imports are no-ops. A matching/empty target comparison is a prerequisite for any separately approved future import.

Local-only source verification was executed: `npx tsx artifacts/verify-neon-import-source.ts`. All 11 table counts and SHA-256 manifests match both protected JSON and read-only SQLite; SQLite foreign keys pass; file sizes and modification times were unchanged. No destination connection/import was performed by that verification.

| Preserved source | Verification |
|---|---|
| `backend/.local/migration/source-local.json` | 854,724 bytes; SHA-256 `719b30632f0ff45b6c7b42f52061b9a637516f03a8caae62da86b406cc19a57b` |
| `backend/.local/migration/source-local.json.sqlite` | 1,122,304 bytes; SHA-256 `6a88f89977525d5446d8e974b582c5195d8a912c1bab3a3d4a71512c9932c88e` |

Source counts: users 2, sessions 3, content 18, revisions 12, audit_logs 36, conversations 2, messages 6, media 1, rate_limits 28, preview_tokens 5, media_cleanup 0. No records, password hashes, conversation contents or image credentials were printed. Existing source/backup files were not overwritten or recreated. This source predates subsequent intentional local CMS corrections; retain any newer PostgreSQL backup too and approve the authoritative source before a future actual import. The separate empty remote D1 export must not replace the populated source.

## Safety outcome

No remote migration, import, seed, reset, truncation, deletion, overwrite or production copy correction was executed. No Render environment value or deployment changed. Only ignored diagnostic tools/evidence and this report were added locally. The database remains unmigrated; the precise next approval is the direct-connection migration command above.
