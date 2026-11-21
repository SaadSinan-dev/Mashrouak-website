# Project results: editorial and engineering guide

## What a visitor sees

The homepage and `/results` use a shared project index; `/work/:id` opens the same evidence file for that project only. The project selector, previous/next controls, scope bars, feature disclosure, stack, measurement tables and evidence links work without hover. The palette, typography and direction come from the existing site. The metric renderer loads only when there are measurements; there is no new chart dependency, canvas renderer or network polling loop.

## Two sources, two kinds of evidence

| Source | What is displayed | What it does not prove |
| --- | --- | --- |
| The existing public Portfolio feed (Firestore / JSON fallback) | Published description, named features, technologies and project-specific design details. Numeric highlights are extracted only from matching published statements. | Tests or performance figures mentioned in a project record have not been rerun by Mashrouak's results page. |
| Mashrouak CMS Results entries | Approved readings, dated observations, or before/after comparisons with methodology and references. | A change is not automatically an improvement or a business outcome. |

The audit on November 21, 2026 found 13 public project records. The feed has no structured comparable performance baselines, time series, conversion or revenue measurements. Mashrouak's own `PUBLIC_3D_AUDIT.md` concerns its website renderer, not those portfolio projects. No client history was seeded from it.

The delivery map counts distinct non-empty feature statements, **not** effort, importance, completion percentage or test coverage. One statement belongs to one editorial group, with quality/delivery, platform/data and interface/access taking precedence over general product work. Bar lengths show each group's share of the listed features. Translations are not counted twice; unmatched wording falls back to the source. A missing source field produces no invented figure. Short signature panels describe recognized statements; unrecognized projects use their own documented feature instead.

## Add a measurement

1. In **Admin → Results**, create an entry. Use a unique metric slug. Copy the ID after `/work/` from the project's case-study address; leave it blank only for a site-wide measurement. Lower display orders appear first.
2. Set the bilingual title, description and unit, category, current value and measurement information. Add a visitor-accessible evidence reference, period, methodology in both languages, and approver. Use **Technical achievement** for an evidenced engineering count, not for a business claim.
3. Choose **Single reading**, **Before and after**, or **Dated history**. Comparisons require a baseline and an explicit attestation of equivalent tools, units and conditions. History additionally requires a current date and one or more distinct earlier observation dates. The series uses elapsed time, not equal spacing between observations. Change is signed absolute difference in the stated unit.
4. **Save draft → Preview** opens the actual visualization, in the selected language and focused on the linked project. Preview is separate from publication. Illustrative and hidden entries are excluded from the public content endpoint, including the assistant's public knowledge inputs. Drafts cannot be published as verified evidence.
5. Publish an approved metric to make it visible. To remove it from public view, turn off **Show metric to visitors**, save and publish; the existing archive/delete lifecycle is also available. Existing entries keep their data, but a legacy baseline isn't plotted until an editor confirms comparability. No database migration or Portfolio-dashboard change is required.

## Files changed

- Public composition: `src/features/results/ResultsSection.tsx`, `ProjectDossier.tsx`, `DesignSignature.tsx`, `MetricReadout.tsx`, `HistoryPlot.tsx`, `evidence.ts`, `record-highlight.ts` and `results.css` in that folder; `src/features/portfolio/CaseStudyPage.tsx`.
- Schema and publication: `shared/schema.ts`, `backend/src/content.ts`, `backend/src/index.ts`, `src/lib/publication.ts`.
- Admin forms and verification: `admin-dashboard/src/ContentManager.tsx`, `FieldEditor.tsx`, `VisualEditor.tsx`, `fields.ts`, and `copy.ts` in that folder.
- Verification and handoff: `tests/results.test.ts`, `tests/results.browser.mjs`, `package.json`, and this guide.

## Reproduce QA

Run `npm test`, `npm run typecheck:all`, `npm run lint` and `npm run build:all`. For `npm run test:integration` and `npm run test:results:browser`, set `TEST_DATABASE_URL` to a **local UTF-8 PostgreSQL** database. The browser test uses its own temporary schema, actual admin forms and public API, and isolated evidence fixtures. Set `PORTFOLIO_FEED_FIXTURE` to a saved version-1 public feed JSON file to review all projects offline; otherwise a small synthetic portfolio is used. Browser captures are written to `artifacts/results-qa/`. No test writes to the live CMS or the Portfolio feed.
