# Production upgrade working plan

The full brief is in the user attachment bdc5ee17-1051-4314-91f7-49b198ad8a15/Pasted text.txt. Additional priority: reproduce/fix repeated publication and audit all Services copy in Arabic/English before completing visual editor, realistic devices, Node/PostgreSQL and hosting.

1. [ ] Publishing pipeline and Services corrections, with three consecutive publication regression checks.
2. [ ] Native Node/Hono/PostgreSQL service, transactional SQL, migrations, D1 backup/import, cleanup scheduling and actual database integration tests.
3. [ ] Visual Website Editor: three panels, shared real public components, exact field selection, bilingual/rich/media inspector, device previews and protected draft/publish/history/undo workflows.
4. [ ] Real smartphone/monitor geometry with official logo assets, alpha transparency, theme materials, deliberate motion, no initialization fallback duplicates and responsive browser QA.
5. [ ] Preserve public Pages project; separate Git-connected admin Pages; Render deployment pending account connection/cost approval; Arabic DEPLOYMENT-GUIDE.txt and final actual verification.

Existing checkout is dirty and must be preserved. No AGENTS.md was found. No commits, Git push, paid resources, destructive data changes or DNS writes authorized. Actual deployments of new services are requested; prepare them concretely before any necessary paid-service approval. Render plugin was discovered and suggested; connection not yet confirmed. Existing Cloudflare account access is via Wrangler. Never print credentials. Cloudinary credentials remain server-only; existing media integration must survive.

Initial findings: Hono business routes use D1-shaped prepare/batch calls and SQLite instr/changes/boolean aggregate SQL. They need an application-owned PostgreSQL repository contract, native connection pool/transactions and explicit SQL changes. No Worker binding may run on Render. The original D1 schema and preserved media rows remain intact. Docker is installed but its engine was initially stopped; Docker Desktop was started hidden for real PostgreSQL testing.

Publishing investigation: backend saves/publishes increment versions and returns committed rows; API already sends no-store. The public resource cache has only polling/focus refresh, no cross-origin publication invalidation, no stable publication revision, and refresh coalesces onto an in-flight older request. Reproduce these paths before naming a root cause. Target fix: transactional publication revision and post-commit notification, real-time public revalidation with revision fallback, generation-safe cache invalidation, and backend-confirmed publish success. Preserve static asset caching and draft isolation.

Dependencies installed for the requested native backend: @hono/node-server, pg; development @types/pg and esbuild. No production services were provisioned.
