import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { resultSchema } from "../shared/schema.ts";

const folder = "artifacts/sync-qa";
await mkdir(folder, { recursive: true });
const server = await createServer({
  configFile: "vite.config.ts",
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}`;
const browser = await chromium.launch();
const results = [],
  errors = [];
const bilingual = (value) => ({ ar: value, en: value });
const metric = resultSchema.parse({
  title: bilingual("Independent measurement"),
  description: bilingual("QA only"),
  unit: bilingual("ms"),
  before: 300,
  after: 180,
  verification: "verified",
  evidence: [],
  projectSlug: "one",
  period: bilingual("Isolated QA"),
  methodology: bilingual("Fixture"),
  approvedBy: "QA",
});
const snapshot = (revision) => ({
  revision,
  updatedAt: new Date().toISOString(),
  entries: [
    ...["home", "work", "results"].map((slug) => ({
      id: slug,
      kind: "pages",
      slug,
      data: {
        sections: [],
        seoTitle: bilingual(""),
        seoDescription: bilingual(""),
      },
    })),
    {
      id: "metric",
      kind: "results",
      slug: "metric",
      data: { ...metric, after: 180 + revision },
    },
  ],
});
const feed = (title) => ({
  version: 1,
  projects: [
    {
      id: "one",
      title,
      titleAr: title,
      category: "web",
      features: ["Database workflow"],
      technologies: ["TypeScript"],
    },
  ],
});
async function setup(language = "en", width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 920 },
    reducedMotion: "reduce",
  });
  await context.addInitScript((language) => {
    if (location.hostname === "localhost")
      localStorage.setItem("mashrouak-language", language);
  }, language);
  const state = {
    revision: 1,
    title: "Loaded project",
    cmsFail: false,
    feedFail: false,
    delayed: false,
    release: null,
    requests: [],
    counts: { content: 0, feed: 0, events: 0, revision: 0 },
  };
  await context.route(/firestore\.googleapis\.com/, (route) => route.abort());
  await context.route("**/api/public/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const kind = path.split("/").pop();
    state.counts[kind]++;
    state.requests.push({
      path,
      kind,
      status: state.cmsFail ? 503 : kind === "events" ? 204 : 200,
    });
    if (kind === "events") return route.fulfill({ status: 204 });
    if (state.cmsFail)
      return route.fulfill({ status: 503, json: { error: "api_unavailable" } });
    return route.fulfill({
      json:
        kind === "revision"
          ? { revision: state.revision }
          : snapshot(state.revision),
    });
  });
  await context.route(
    "**/.netlify/functions/public-projects",
    async (route) => {
      state.counts.feed++;
      const title = state.title;
      state.requests.push({
        path: "portfolio",
        status: state.feedFail ? 503 : 200,
      });
      if (state.delayed) {
        state.delayed = false;
        await new Promise((resolve) => {
          state.release = resolve;
        });
      }
      await route
        .fulfill(
          state.feedFail
            ? { status: 503, json: { error: "unavailable" } }
            : { json: feed(title) },
        )
        .catch(() => {});
    },
  );
  context.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  const page = await context.newPage();
  const recover = async () => {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("pageshow"));
    });
  };
  return { context, page, state, recover };
}
try {
  const stable = await setup();
  await stable.page.goto(base + "/work");
  await stable.page.locator(".showcase-card h3").waitFor();
  assert.equal(stable.state.counts.feed, 1);
  for (let index = 0; index < 6; index++) {
    const target = index % 2 ? "/work" : "/results";
    await stable.page
      .locator(`.site-header a[href="${target}"]`)
      .first()
      .click();
    await stable.page
      .locator(target === "/work" ? ".showcase-card" : ".dossier")
      .waitFor();
  }
  assert.equal(
    stable.state.counts.feed,
    1,
    "route changes do not refetch the same fresh resource",
  );
  assert.equal(
    stable.state.counts.content,
    1,
    "publication content is shared across routes",
  );
  assert.equal(
    stable.state.counts.events,
    1,
    "only one publication subscription",
  );
  results.push(
    "stable loading and six client navigation cycles share content, feed and stream",
  );

  await stable.page.clock.install();
  await stable.page.clock.runFor(1100);
  stable.state.title = "Recovered project";
  stable.state.revision = 2;
  const contentBefore = stable.state.counts.content,
    feedsBefore = stable.state.counts.feed;
  await stable.recover();
  await stable.page.clock.runFor(200);
  await stable.page
    .getByRole("heading", { name: "Recovered project", exact: true })
    .waitFor();
  assert.equal(
    stable.state.counts.feed,
    feedsBefore + 1,
    "coalesced lifecycle requests",
  );
  assert.ok(stable.state.counts.content <= contentBefore + 2);
  results.push("online, focus and pageshow recovery signals coalesce");

  stable.state.feedFail = true;
  stable.state.cmsFail = true;
  await stable.page.clock.runFor(70000);
  await stable.page.locator(".showcase-status button").waitFor();
  assert.equal(await stable.page.locator(".showcase-card").count(), 1);
  const failed = { ...stable.state.counts };
  await stable.page.clock.runFor(180000);
  assert.equal(
    stable.state.counts.feed,
    failed.feed,
    "no unbounded feed retries",
  );
  assert.equal(
    stable.state.counts.revision,
    failed.revision,
    "no unbounded failed revision polling",
  );
  results.push(
    "exhausted retries retain rendered projects and stop request storms",
  );
  await stable.context.setOffline(true);
  await stable.page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await stable.page.clock.runFor(200);
  stable.state.feedFail = false;
  stable.state.cmsFail = false;
  stable.state.title = "After offline";
  stable.state.revision = 3;
  await stable.context.setOffline(false);
  await stable.recover();
  await stable.page.clock.runFor(200);
  await stable.page
    .getByRole("heading", { name: "After offline", exact: true })
    .waitFor();
  await stable.page
    .locator(".showcase-status button")
    .waitFor({ state: "detached" });
  results.push(
    "Chromium offline/online restoration refreshes and clears stale UI without manual retry",
  );

  await stable.page.clock.runFor(1100);
  stable.state.delayed = true;
  stable.state.title = "Latest project";
  await stable.recover();
  await stable.page.clock.runFor(200);
  await stable.page.waitForFunction(() =>
    document
      .querySelector(".showcase-card h3")
      ?.textContent.includes("After offline"),
  );
  assert.equal(await stable.page.locator(".showcase-status button").count(), 0);
  await stable.page.screenshot({
    path: folder + "/revalidating-desktop.png",
    fullPage: true,
  });
  stable.state.release();
  await stable.page
    .getByRole("heading", { name: "Latest project", exact: true })
    .waitFor();
  results.push(
    "last valid projects remain visible while a replacement response is pending",
  );
  await stable.page.clock.runFor(1100);
  stable.state.title = "After suspension";
  const beforeFreeze = { ...stable.state.counts };
  await stable.page.evaluate(() => document.dispatchEvent(new Event("freeze")));
  await stable.page.clock.runFor(60000);
  assert.equal(stable.state.counts.feed, beforeFreeze.feed);
  assert.equal(stable.state.counts.revision, beforeFreeze.revision);
  await stable.page.evaluate(() => document.dispatchEvent(new Event("resume")));
  await stable.page.clock.runFor(200);
  await stable.page
    .getByRole("heading", { name: "After suspension", exact: true })
    .waitFor();
  results.push(
    "injected freeze/resume lifecycle events pause work and restore fresh data",
  );
  await stable.context.close();

  const interrupted = await setup();
  interrupted.state.delayed = true;
  await interrupted.page.goto(base + "/work");
  await interrupted.page
    .locator('.showcase-status[aria-busy="true"]')
    .waitFor();
  await interrupted.page.clock.install();
  await interrupted.context.setOffline(true);
  await interrupted.page.evaluate(() =>
    window.dispatchEvent(new Event("offline")),
  );
  interrupted.state.title = "New response after interruption";
  await interrupted.context.setOffline(false);
  await interrupted.recover();
  await interrupted.page.clock.runFor(200);
  await interrupted.page
    .getByRole("heading", {
      name: "New response after interruption",
      exact: true,
    })
    .waitFor();
  interrupted.state.release();
  await interrupted.page.clock.runFor(200);
  assert.equal(
    await interrupted.page
      .getByRole("heading", { name: "Loaded project", exact: true })
      .count(),
    0,
  );
  results.push(
    "network loss during initial load aborts obsolete work and cannot overwrite the recovered response",
  );
  await interrupted.context.close();

  for (const language of ["en", "ar"]) {
    const independent = await setup(language, language === "ar" ? 390 : 1440);
    independent.state.cmsFail = true;
    await independent.page.goto(base + "/work");
    await independent.page.locator(".showcase-card h3").waitFor();
    assert.equal(await independent.page.locator(".showcase-card").count(), 1);
    await independent.page.clock.install();
    await independent.page.clock.runFor(8000);
    await independent.page.locator(".content-refresh-error").waitFor();
    assert.ok(await independent.page.locator(".showcase-card").isVisible());
    results.push(
      `${language}: Projects remain available when CMS fails initially`,
    );
    independent.state.cmsFail = false;
    await independent.recover();
    await independent.page.clock.runFor(200);
    await independent.page
      .locator(".content-refresh-error")
      .waitFor({ state: "detached" });
    independent.state.feedFail = true;
    await independent.page.goto(base + "/results");
    await independent.page.locator(".metric-readout").waitFor();
    assert.ok(await independent.page.locator(".metric-readout").innerText());
    await independent.page.clock.runFor(8000);
    await independent.page.locator(".showcase-status button").waitFor();
    assert.ok(await independent.page.locator(".metric-readout").isVisible());
    assert.ok(
      await independent.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await independent.page.locator("#results").screenshot({
      path: `${folder}/results-cached-${language}.png`,
      style:
        ".site-header,.skip-link,.support-launcher { visibility:hidden !important }",
    });
    independent.state.cmsFail = true;
    await independent.page.reload();
    await independent.page.locator(".metric-readout").waitFor();
    assert.ok(await independent.page.locator(".dossier").isVisible());
    results.push(
      `${language}: saved projects and CMS measurements survive reload with both services unavailable`,
    );
    await independent.context.close();
  }
  const feedDown = await setup();
  feedDown.state.feedFail = true;
  await feedDown.page.goto(base + "/results");
  await feedDown.page.locator(".metric-readout").waitFor();
  assert.equal(await feedDown.page.locator(".dossier").count(), 0);
  assert.match(
    await feedDown.page.locator(".metric-readout").innerText(),
    /Independent measurement/,
  );
  results.push(
    "project-linked CMS measurement renders even with no portfolio snapshot",
  );
  await feedDown.context.close();
  assert.deepEqual(errors, []);
  await writeFile(
    folder + "/browser-results.json",
    JSON.stringify(
      {
        results,
        requestTrace: stable.state.requests,
        counts: stable.state.counts,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${results.length} browser scenarios: ${results.join("; ")}.`,
  );
} finally {
  await browser.close();
  await server.close();
}
