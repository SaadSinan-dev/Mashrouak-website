# Neon PostgreSQL protocol/TLS diagnosis

10 November 2026, Asia/Riyadh. Source inspected at commit `e077bf5dc9cd2141c6b8ebf9ebf20414c01d4080`. No application source, dependencies/lockfiles, credentials, provider environment, migrations or deployment changed during this investigation. Temporary tools and redacted event traces are under ignored `artifacts`.

## Confirmed failure boundary

**Both native PostgreSQL connections establish TCP, send the PostgreSQL SSLRequest, and are reset before the server's SSL acknowledgement. TLS, PostgreSQL startup, authentication and query execution are never reached in the baseline test.** A successful `Test-NetConnection` is consistent with these results; port reachability is not the failing phase.

The final baseline used the application's actual 30-second connection timeout. It reproduced the reported error on both URLs, with sanitized fields:

| URL variable | DNS | TCP | Last protocol event | Failure | Elapsed |
|---|---|---|---|---|---|
| `DATABASE_URL` (pooled) | Passed | Passed at 140 ms | SSLRequest sent; no acknowledgement | `code: ECONNRESET`, `syscall: read`, phase `postgres_sslrequest_wait` | 19,604 ms |
| `DIRECT_DATABASE_URL` (direct) | Passed | Passed at 884 ms | SSLRequest sent; no acknowledgement | `code: ECONNRESET`, `syscall: read`, phase `postgres_sslrequest_wait` | 20,745 ms |

For both: `tlsCreated:false`, `tlsVerified:false`, `startupQueued:false`, `authentication:false`, `ready:false`, `query:false`. No database password was sent during these failed baseline connections because authentication was never reached. `SELECT 1 AS ok` was prepared by the diagnostic but could not be issued through native `pg`.

This establishes the exact observed protocol failure. It does **not** identify which network intermediary or remote endpoint issued the reset. No packet-source attribution was performed. The active ProTUN interface is a possible path component, not a proven cause. The owner explicitly chose to keep the current network, so no VPN pause, route, DNS or firewall change was attempted. A controlled comparison on another path remains necessary to attribute that component.

## Installed versions and exact SSL configuration

`npm ls pg pg-pool pg-connection-string` reported:

| Component | Version |
|---|---|
| Node.js | `24.19.0` |
| `pg` | `8.23.1` |
| `pg-pool` | `3.14.0` |
| `pg-connection-string` | `2.14.1` |

Inspected `backend/src/database.ts`, `backend/scripts/check-database.ts`, and installed `pg/lib/{client,connection,connection-parameters,stream}.js`. The protected check creates the application's real pool and first calls `assertUtf8()`; its generic catch cannot itself reveal the earlier protocol phase. The temporary client trace therefore instruments that phase without changing production code.

Both protected connection strings contain `sslmode=require` and `channel_binding=require`, with no URL host override, no IP-literal hostname, no SSL-disable override and no explicit `sslnegotiation`. Neither URL was printed. Both target the real Neon DNS hostname, not a manually substituted IP.

`postgresConnectionConfig()` removes unsupported startup `options`/`search_path`, normalizes remote `sslmode` to **`verify-full`**, removes libpq-compatibility mode, and returns `options:''`, pool max 4, idle timeout 30 seconds, connection timeout 30 seconds. It rejects insecure SSL modes and inherited PGOPTIONS. The same configuration feeds both pool and diagnostic client.

In this installed parser, normalized `sslmode=verify-full` becomes `ssl:{}`. Node's default certificate-chain and hostname verification remain enabled: there is no custom hostname checker, custom CA or certificate-verification bypass. No NODE_TLS_REJECT_UNAUTHORIZED=0, PGSSLMODE override or PGOPTIONS was present in this process. Thus the absence of an explicit `ssl` object in the factory does **not** mean TLS is disabled.

Installed `pg/lib/connection.js → upgradeToSSL()` constructs TLS options with the original `host`; when that host is not an IP, it explicitly sets `options.servername = host`. DNS resolution chooses a socket address but does not replace the host/SNI value. Neon lists node-postgres as SNI-capable and notes that newer clients do not need endpoint-ID workarounds. [Neon SNI guidance](https://neon.com/docs/connect/connection-errors#the-endpoint-id-is-not-specified), [Neon Node.js guide](https://neon.com/docs/guides/node).

The URL `channel_binding=require` is present, but installed `pg` enables SCRAM channel binding with its native `enableChannelBinding` option; the observed client flag is false. That authentication-stage distinction cannot cause this reset: the failed baseline has not started TLS or received an authentication request. It was not changed or misrepresented as a solution. [node-postgres TLS/channel-binding documentation](https://node-postgres.com/features/ssl).

## Controlled comparisons actually executed

| Diagnostic | Pooled result | Direct result | What it establishes |
|---|---|---|---|
| Application-equivalent `pg.Client`, normal PostgreSQL SSL negotiation, 30 s deadline | `read ECONNRESET` before TLS | Same | Exact reported failure phase reproduced |
| Explicit `ssl:{servername: actual Neon hostname, rejectUnauthorized:true}`, 15 s deadline | Timeout waiting for SSL acknowledgement | Same | Adding explicit SNI does not repair this pre-TLS failure |
| Documented direct TLS negotiation, 15 s deadline | TLS handshake timeout | Same | Skipping SSLRequest also did not produce a working connection on this path |
| Raw 8-byte PostgreSQL SSLRequest to each of the three resolved IPv4 addresses, 6 s deadline | No SSL reply on any address | Same | Not limited to one selected address or pg pool initialization; no credentials used |
| System DNS versus Google/Cloudflare DNS-over-HTTPS | Same three-address set | Same | No observed discrepancy between these resolvers |
| Official Neon HTTPS driver, `readOnly:true`, `SELECT 1 AS ok` | Returned `1` | Returned `1` | Credentials and the live database work through HTTPS; this does not prove native port-5432 protocol works |

The explicit SSL-object test removes only the in-memory URL's `sslmode` before supplying the strictly verified object, because installed pg parsing would otherwise replace it. No file/provider URL was edited. [Documented SSL configuration precedence](https://node-postgres.com/features/ssl#usage-with-connectionstring).

The direct TLS test adds `sslnegotiation=direct` **only in memory**, while retaining `sslmode=verify-full`. Neon documents support for direct TLS in its proxy; installed pg supports it and supplies ALPN `postgresql`. [Neon direct SSL support](https://neon.com/blog/postgres-17), [pg direct negotiation](https://node-postgres.com/features/ssl#direct-ssl-negotiation).

Actual TLS option capture in that test showed:

```json
{
  "servernameMatchesActualNeonHostname": true,
  "servernameIsIp": false,
  "hostMatchesActualNeonHostname": true,
  "rejectUnauthorized": true,
  "identityVerificationIsDefault": true,
  "alpn": ["postgresql"]
}
```

No successful `secureConnect` or authentication event followed. `pg` queues its startup packet while TLS is connecting; the direct-mode `startupQueued:true` flag is **not** proof of successful TLS/startup/authentication. Certificate validation was kept enabled; it never completed, so these results must not be described as successful certificate verification.

## Smallest safe correction

**No application SSL/SNI correction is justified by this evidence.** The baseline fails before the driver can construct TLS/SNI, and an equally strict explicit-SNI comparison did not fix it. The direct-TLS experiment also failed and was not promoted into application configuration. No driver upgrade, certificate bypass or permanent connection-string change was made.

The cause established here is a native PostgreSQL negotiation reset on the current path. Whether the responsible component is local filtering/tunneling, an upstream intermediary, or endpoint-side behavior remains unproven. Do not label it a blocked TCP port, an invalid password, a certificate rejection or a missing-SNI bug without additional evidence. The separately established missing `publication_state` table is a later startup/schema issue; it cannot explain a pre-authentication reset.

## Reproducible temporary commands

From the repository root, using only the existing protected local credentials:

```powershell
npx tsx artifacts/pg-handshake-diagnostic.ts baseline
npx tsx artifacts/pg-handshake-diagnostic.ts explicit-sni
npx tsx artifacts/pg-handshake-diagnostic.ts direct-tls
```

These modes are implemented in the temporary diagnostic, not invented options for `db:check`. Each endpoint is tested separately; the only application SQL is `SELECT 1 AS ok`. The tool prints a whitelist of phases/options/error codes, never credentials or complete pg objects, and saves redacted JSON. A failed diagnostic exits nonzero. No environment file is changed. The TLS wrapper is process-local and restored after each client.

Evidence files: `artifacts/pg-handshake-baseline.json`, `artifacts/pg-handshake-explicit-sni.json`, `artifacts/pg-handshake-direct-tls.json`. The baseline was rerun after the comparison tests using the factory's actual 30-second deadline; the reset persisted. No application correction was made, so there is no claimed post-fix success.

Next diagnostic step, when the owner permits a path change: rerun `baseline` on another trusted network or with the local VPN/tunnel paused, keeping credentials and code unchanged. That comparison is not authorized now and has not been performed. No migrations, imports, seeds, resets, writes, provider configuration changes or redeployment occurred.
