# Live portfolio projects

## How publishing works

Portfolio Admin is the editor. Firestore `projects/{id}` holds the complete record. The dashboard finishes Cloudinary uploads first, then commits the source and its `publicProjects/{id}` projection together. A failed commit leaves the previous publication intact. Updating an existing project reads its current source in a transaction. A concurrent change requires reopening the editor. The success notice follows Firestore acknowledgement.

The projection contains the document ID, bilingual titles, descriptions, engineering focus and features, category, order, featured flag, technologies, HTTPS gallery URLs and optional HTTPS demo and repository URLs. The first image is the cover. Legacy image keys resolve to the Portfolio’s public image directory. Private, draft, archived and unpublished projects have no public document. Historical visibility flags are checked during migration. Publishing overwrites the whole projection, so removed fields do not linger.

Both public sites subscribe to the public collection through the Firestore SDK. An open detail view looks up the current record by ID. Featured projects sort first, followed by display order and ID. The personal site retains its category tabs. The Mashrouak homepage displays the first three projects. Its homepage, work page and detail pages share one listener per mounted application. The SDK reconnects after interruptions. Consumers retain their last result while disconnected. Mashrouak also retains its last validated result in browser storage. Cached copies and previously downloaded screenshots cannot be recalled from offline browsers. Reconnected clients remove withdrawn work on the authoritative snapshot.

Mashrouak can read the existing Netlify JSON endpoint when the initial listener is delayed or fails. The endpoint returns a version 1 snapshot of the same public documents with `Cache-Control: no-store`. A late fallback cannot override a newer server snapshot. There is no periodic feed refresh. Each active client incurs ordinary Firestore listener reads.

## Production rollout

1. In the Firebase Console for `portfolio-4b886`, compare the deployed Firestore rules with `portfolio-new/firestore.rules`. Preserve rules for other applications and remove overlapping public grants on the raw projects path. Close old dashboard tabs. During the cutover, apply the merged rules from the Portfolio repository root with `firebase deploy --only firestore:rules --project portfolio-4b886`. The old readers may show an unavailable state until steps 2–4 are complete. For an uninterrupted rollout, stage the public projection rule first and apply the final raw-project restriction as soon as the readers switch. Existing raw collection access under that staged approach depends on the previous rules.
2. Deploy the Portfolio Admin Netlify site from the complete `portfolio-new` repository, base directory `portfolio-admin`, build command `npm run build`, publish directory `dist`. Keep the existing Firebase web settings and Cloudinary cloud name and upload preset. When legacy images are hosted on a different Portfolio domain, set optional `VITE_PUBLIC_PORTFOLIO_URL` to its absolute HTTPS origin. Log into the new dashboard, open **Existing project migration**, and select **Synchronize existing projects** once. Wait for “Existing projects synchronized.” Rerunning the migration safely rereads each source.
3. Deploy the personal Portfolio Netlify site from the same repository, base directory `portfolio`, command `npm run build`, publish `dist`. Keep the site's `netlify.toml` and functions directory. Retain `VITE_FIREBASE_*` and any existing server-side `FIREBASE_WEB_API_KEY`. Check `https://saad-dev-portfolio.netlify.app/.netlify/functions/public-projects` for version 1 and the expected project count. For staging consumers, add the exact origin to `PUBLIC_PROJECTS_ORIGINS`.
4. Deploy the Mashrouak public Cloudflare Pages site from the Mashrouak repository root with `npm run build`, output `dist`. The build generates the Firestore connection permission in `_headers`. The public defaults are project ID `portfolio-4b886` and the Portfolio Netlify feed. Override `VITE_PORTFOLIO_FIREBASE_PROJECT_ID` and `VITE_PORTFOLIO_PROJECTS_URL` together for staging. Mashrouak Admin and the Render API have no changes to deploy for this upgrade.
5. In already-open tabs, create a temporary public project in the new dashboard. Check the Portfolio category tab, Mashrouak homepage, work page and detail. Change its title, cover and order. Set it private and verify it disappears, then delete the temporary source. Future edits use just the dashboard. Direct writes from Firebase Console, imports or retired dashboard builds bypass the dashboard transaction.

## Repeat the browser verification

Use the official Firebase CLI and Java 21. Run `npm ci` in both Portfolio application directories and the Mashrouak root. Install Chromium from the Mashrouak root with `npx playwright install chromium`. These commands run in separate PowerShell terminals.

1. At the Portfolio repository root, run `firebase emulators:start --only 'firestore,auth' --project demo-projects`.
2. In each Portfolio application terminal set the variables below, then start the dashboard in `portfolio-admin` with `npm run dev -- --host 127.0.0.1 --port 7281 --strictPort`. Start the public site in `portfolio` with the same command using port 7282.

```powershell
$env:VITE_FIREBASE_PROJECT_ID='demo-projects'
$env:VITE_FIREBASE_API_KEY='demo-key'
$env:VITE_FIREBASE_AUTH_DOMAIN='demo-projects.firebaseapp.com'
$env:VITE_FIREBASE_APP_ID='demo-app'
$env:VITE_CLOUDINARY_CLOUD_NAME='demo'
$env:VITE_CLOUDINARY_UPLOAD_PRESET='demo'
```

3. At the Mashrouak root set `$env:VITE_PORTFOLIO_FIREBASE_PROJECT_ID='demo-projects'` and run `npm run dev -- --host 127.0.0.1 --port 7283 --strictPort`.
4. In a separate Mashrouak terminal run `npm run test:portfolio:live`. If the checkouts are elsewhere set `PORTFOLIO_ASSETS_DIR` to the Portfolio’s `src/assets/projects` directory. The test uses real dashboard forms, authentication, Firestore commits and listeners. Cloudinary response and unrelated Mashrouak CMS requests use fixtures. The test writes captures to `artifacts/live-work/`.
5. For independent fallback checks set `$env:SITE_URL='http://127.0.0.1:7283'` and run `npm run test:portfolio:browser`. The suite disconnects the live transport and exercises the JSON fallback, detail navigation, empty, error, and last-saved states.
