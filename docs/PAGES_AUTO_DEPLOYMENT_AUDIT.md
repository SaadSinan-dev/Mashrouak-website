# GitHub–Cloudflare Pages automatic deployment audit

Verified 10 November 2026 against the actual Cloudflare account/project APIs, GitHub branch and Cloudflare-app check runs, Cloudflare build logs, and live Pages URLs. This is separate from the public 3D changes in `PUBLIC_3D_AUDIT.md`.

## Verified project configuration

Both existing projects use GitHub repository **`SaadSinan-dev/Mashrouak-website`** (repository ID `1450332088`), with `main` as the production branch.

| Setting | `mashrouak-net` | `mashrouak-admin` |
| --- | --- | --- |
| Native GitHub integration | Connected and working | Connected and working |
| Automatic production deployments | Enabled | Enabled |
| Build root | Repository root | Repository root |
| Build command | `npm run build` (stored with harmless leading tab whitespace) | `npm run build -w @mashrouak/admin` |
| Output directory | `dist` | `admin-dashboard/dist` |
| Build-watch includes | `["*"]` | `["*"]` |
| Build-watch excludes | `[]` | `[]` |
| Build image | V3 | V3 |
| Preview deployments | Non-production branches; separate preview environment | Non-production branches; separate preview environment |

All repository paths are watched, covering public/admin source, shared components, the root `functions/api/[[path]].ts` proxy, configuration, dependencies and lockfile changes. The repository-root build context is important: logs confirm **both** projects compile the root `/functions` directory. Environment variables and secrets remain separate between production and preview; none were copied or changed.

Cloudflare documents [native Git deployment behavior](https://developers.cloudflare.com/pages/configuration/git-integration/), [multiple projects using one repository](https://developers.cloudflare.com/pages/configuration/monorepos/), and the default [watch-all paths configuration](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).

## Evidence of an actual automatic push

GitHub `main` was `e45836223c973c20fccd44c09db19bd6b857be81` at both initial and final inspection. The existing push created both following **Production** deployments at **12:26:15 UTC** on 10 November 2026:

| Project | Native trigger | Deployment | Result |
| --- | --- | --- | --- |
| Public | `github:push`, branch `main`, commit `e458362…` | [`ccf230b6-0e59-4baa-a498-20c86a6baff5`](https://dash.cloudflare.com/?to=/2bb9190a914533101fb040ac8bf02a4e/pages/view/mashrouak-net/ccf230b6-0e59-4baa-a498-20c86a6baff5) | Successful at 12:26:57 UTC |
| Admin | `github:push`, branch `main`, commit `e458362…` | [`dcc824ff-88d9-4b80-9cf6-72b71344850e`](https://dash.cloudflare.com/?to=/2bb9190a914533101fb040ac8bf02a4e/pages/view/mashrouak-admin/dcc824ff-88d9-4b80-9cf6-72b71344850e) | Successful at 12:27:25 UTC |

GitHub's **Cloudflare Workers and Pages** app independently records both check runs as `completed / success` for the same SHA. Both build logs explicitly contain `HEAD is now at e458362 Final3 commit`, the expected build commands, compilation of `/functions`, and successful publication. No test push or new repository commit was needed to prove this existing push reached both integrations.

## Observed stale-public-site cause and correction

The public deployment created later at **12:44:33 UTC**, `c643c8a2-7152-4ebd-8261-897e6bd7a917`, was pinned to the older parent commit **`346a15f5d33062ebf66e0d966bf371d71c916eb2`**. Its log explicitly checked out `346a15f`, and it became the canonical production deployment after the successful `e458362` deployment. Another older-commit deployment also appeared after the latest-main push.

This establishes that the stale public code came from a **later deployment of an older source commit**, rather than Cloudflare restoring outdated compiled output for the latest commit. The available deployment metadata retains its original `github:push` trigger, so the initiating action/actor of those later older-commit deployments was not established. Retrying an older deployment is consistent with the evidence, but is not claimed as a proven operator action.

One corrective native Git build was requested using `branch=main`, which the [Cloudflare deployment API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/) resolves to that branch's HEAD. The resulting **ad hoc corrective build** is distinct from the automatic-push evidence above:

- Public deployment [`62c1113c-8181-41de-853b-1a5e97e79258`](https://dash.cloudflare.com/?to=/2bb9190a914533101fb040ac8bf02a4e/pages/view/mashrouak-net/62c1113c-8181-41de-853b-1a5e97e79258) checked out **`e458362`** and completed successfully at **13:12:25 UTC**.
- The public canonical production deployment now points to that deployment. Admin remains on its successful automatic `e458362` deployment.
- Both [public](https://mashrouak-net.pages.dev) and [admin](https://mashrouak-admin.pages.dev) production URLs returned HTTP 200, with HTML matching their respective successful immutable deployment URLs.

No Git-integration setting change was necessary. Project configuration was compared before and after: source connection, branch controls, build configuration, production/preview variable and secret descriptors, compatibility settings, and domains remained identical. No secrets, webhooks, external services, DNS, database settings, or production data were added or changed.

## Normal workflow

Commit reviewed changes and push `main`. Native Git integration builds both projects; successful builds publish to production. Other branches stay in the preview environment. There is no recurring manual deployment or Retry Deployment step. Avoid redeploying a historical commit when the intention is to publish current `main`.

The new 3D implementation remains in the local working tree, ready for review and a normal commit/push; this audit's corrective production build deployed the existing GitHub `main` commit, not those uncommitted changes.

Sanitized evidence is saved in ignored `artifacts/pages-deployment-audit/evidence.json`. Existing environment values, credentials and build logs were not written into this report.
