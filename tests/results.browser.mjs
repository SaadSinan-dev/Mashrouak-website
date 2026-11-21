import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createTestPlatform } from "./postgres-fixture.ts";
import { hash } from "../backend/src/security.ts";

const folder = "artifacts/results-qa";
await mkdir(folder, { recursive: true });
const sample = {
  id: "case",
  title: "Project Alpha",
  category: "mobile",
  technologies: ["React", "TypeScript"],
  features: [
    "Database operations",
    "Server-owned decisions",
    "Accessible navigation",
    "Search",
  ],
};
const feed = process.env.PORTFOLIO_FEED_FIXTURE
  ? JSON.parse(await readFile(process.env.PORTFOLIO_FEED_FIXTURE, "utf8"))
  : {
      version: 1,
      projects: [
        sample,
        { ...sample, id: "second", title: "Project Beta", category: "web" },
      ],
    };
const platform = await createTestPlatform({ http: true, seed: true });
const proxy = { "/api": { target: platform.origin, changeOrigin: false } };
const start = async (admin) => {
  const server = await createServer({
    root: admin ? "admin-dashboard" : ".",
    configFile: admin ? "admin-dashboard/vite.config.ts" : "vite.config.ts",
    server: { host: "127.0.0.1", port: 0, proxy },
  });
  await server.listen();
  return server;
};
const site = await start(false),
  dashboard = await start(true);
const origin = (server) =>
  `http://localhost:${server.httpServer.address().port}`;
platform.env.PUBLIC_ORIGIN = origin(site);
platform.env.ADMIN_ORIGIN = origin(dashboard);
const browser = await chromium.launch();
const errors = [];
const cleanCapture = {
  style:
    ".site-header,.skip-link,.support-launcher {visibility:hidden !important}",
};
async function context(language, width, snapshot = feed, theme = "light") {
  const ctx = await browser.newContext({
    viewport: { width, height: 920 },
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(
    ({ language, theme }) => {
      if (location.hostname !== "localhost") return;
      localStorage.setItem("mashrouak-language", language);
      localStorage.setItem("mashrouak-theme", theme);
      localStorage.setItem("mashrouak-admin-language", "en");
    },
    { language, theme },
  );
  await ctx.route(/firestore\.googleapis\.com|127\.0\.0\.1:8188/, (route) =>
    route.abort(),
  );
  await ctx.route("**/.netlify/functions/public-projects", (route) =>
    route.fulfill({ json: snapshot }),
  );
  ctx.on("page", (page) =>
    page.on("pageerror", (err) => errors.push(err.message)),
  );
  return ctx;
}
async function fits(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "No page overflow",
  );
}
try {
  const ctx = await context("en", 1440),
    page = await ctx.newPage();
  await page.goto(origin(site) + "/results");
  const section = page.locator("#results");
  const choose = section.getByRole("combobox");
  await choose.waitFor();
  assert.equal(await choose.locator("option").count(), feed.projects.length);
  for (const item of feed.projects) {
    await choose.selectOption(item.id);
    await page
      .getByRole("heading", { name: item.title, exact: true })
      .waitFor();
    await fits(page);
  }
  await choose.selectOption(feed.projects[0].id);
  await section.getByRole("button", { name: "Next project" }).click();
  await section.getByRole("button", { name: "Previous project" }).click();
  await section.locator(".scope-bars button").last().focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await section
      .locator(".scope-bars button")
      .last()
      .getAttribute("aria-pressed"),
    "true",
  );
  await section.locator(".scope-bars button").first().click();
  await section.screenshot({
    ...cleanCapture,
    path: folder + "/desktop-en.png",
  });
  await choose.selectOption(feed.projects[1].id);
  await section
    .locator(".dossier")
    .screenshot({ ...cleanCapture, path: folder + "/second-project.png" });
  await choose.selectOption(feed.projects[0].id);
  await section.getByRole("link", { name: "Case study" }).click();
  await page.locator(".showcase-detail-hero h1").waitFor();
  await section.locator(".dossier").waitFor();
  assert.equal(await section.getByRole("combobox").count(), 0);
  for (const [width, language, theme] of [
    [320, "ar", "dark"],
    [390, "ar", "light"],
    [430, "en", "light"],
    [1024, "ar", "dark"],
  ]) {
    const mobile = await context(language, width, feed, theme),
      tab = await mobile.newPage();
    await tab.goto(origin(site) + "/results");
    await tab.locator(".dossier").waitFor();
    await fits(tab);
    assert.equal(
      await tab.locator("html").getAttribute("dir"),
      language === "ar" ? "rtl" : "ltr",
    );
    await tab.locator(".scope-bars button").last().click();
    await tab.locator(".stack-note summary").first().click();
    await fits(tab);
    if (width === 390 || width === 1024)
      await tab
        .locator("#results")
        .screenshot({
          ...cleanCapture,
          path: `${folder}/${width}-${language}.png`,
        });
    await mobile.close();
  }
  for (const [projects, selector] of [
    [[], ".results-empty"],
    [[{ id: "bare", title: "Unmeasured", category: "web" }], ".scope-sheet"],
  ]) {
    const missing = await context("en", 320, { version: 1, projects }),
      tab = await missing.newPage();
    await tab.goto(origin(site) + "/results");
    await tab.locator(selector).waitFor();
    assert.equal(
      await tab.locator(".scope-bars,.record-reading,.metric-readout").count(),
      0,
    );
    await fits(tab);
    await missing.close();
  }
  const token = crypto.randomUUID(),
    owner = crypto.randomUUID();
  await platform.db
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,'metric@example.test','QA','unused','owner')",
    )
    .bind(owner)
    .run();
  await platform.db
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .bind(await hash(token), owner, Date.now() + 3600000)
    .run();
  await ctx.addCookies([
    {
      name: "mashrouak_admin",
      value: token,
      domain: "localhost",
      path: "/api",
    },
  ]);
  const admin = await ctx.newPage();
  await admin.goto(origin(dashboard) + "/content/results");
  await admin.getByRole("button", { name: "Create new" }).first().click();
  await admin.locator(".editor-meta input").first().fill("qa-metric");
  async function bilingual(label, ar, en) {
    const group = admin.getByRole("group", { name: label, exact: true });
    await group.locator("[lang=ar]").fill(ar);
    await group.locator("[lang=en]").fill(en);
  }
  await bilingual("Title", "قياس تجريبي", "QA metric");
  await bilingual("Description", "للاختبار فقط", "Isolated QA fixture");
  await bilingual("Measurement unit", "مللي ثانية", "ms");
  await bilingual("Measurement period", "نوفمبر", "November");
  await bilingual(
    "Measurement methodology",
    "ظروف متطابقة",
    "Identical test conditions",
  );
  await admin
    .getByLabel("Project ID (from the /work/ address)")
    .fill(feed.projects[1].id);
  await admin.getByLabel("Metric category").selectOption("performance");
  await admin.getByLabel("Visualization").selectOption("comparison");
  await admin.getByLabel("Before value").fill("320");
  await admin.getByLabel("After value").fill("180");
  await admin.getByLabel("I confirmed equivalent").check();
  await admin.getByLabel("Verification state").selectOption("demonstration");
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByRole("button", { name: "Preview", exact: true }).click();
  const link = admin.locator(".preview-link");
  await link.waitFor();
  const preview = await ctx.newPage(),
    url = new URL(await link.getAttribute("href"));
  await preview.goto(origin(site) + url.pathname + url.search);
  await preview.locator(".metric-readout").waitFor();
  assert.match(
    await preview.locator(".metric-readout").innerText(),
    /illustrative data/i,
  );
  assert.match(await preview.locator("figcaption").innerText(), /-140/);
  await page.goto(origin(site) + "/results");
  await page.locator(".dossier").waitFor();
  assert.equal(await page.locator(".metric-readout").count(), 0);
  await admin.getByLabel("Verification state").selectOption("verified");
  await admin.getByLabel("Approved by").fill("QA reviewer");
  const evidence = admin.locator(".editor-array--evidence");
  await evidence.getByRole("button", { name: "Add", exact: true }).click();
  await bilingual("Label", "مصدر تجريبي", "Fixture report");
  await evidence.getByLabel("URL", { exact: true }).fill("/report");
  await admin.getByLabel("Visualization").selectOption("history");
  await admin.getByLabel("Current measurement date").fill("2026-11-01");
  const history = admin.locator(".editor-array--observations");
  await history.getByRole("button", { name: "Add", exact: true }).click();
  await history.getByLabel("Observation date").fill("2026-10-01");
  await history.getByLabel("Reading", { exact: true }).fill("320");
  const savePublish = async () => {
    await admin
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    const done = admin.waitForResponse(
      (res) =>
        res.url().endsWith("/publish") && res.request().method() === "POST",
    );
    await admin.getByRole("button", { name: "Publish", exact: true }).click();
    assert.equal((await done).status(), 200);
  };
  await savePublish();
  await choose.selectOption(feed.projects[1].id);
  await page.locator(".metric-readout").waitFor();
  await page.getByLabel("Inspect reading").selectOption("2026-10-01");
  assert.match(
    await page.locator(".history-inspect output").innerText(),
    /320 ms/,
  );
  await page.getByText("View readings", { exact: true }).click();
  assert.equal(await page.locator(".metric-readout tbody tr").count(), 2);
  await page.getByText("Method & evidence", { exact: true }).click();
  await page.getByRole("link", { name: "Fixture report" }).waitFor();
  await page
    .locator(".metric-readout")
    .screenshot({ ...cleanCapture, path: folder + "/history-qa.png" });
  await admin.getByLabel("Show metric to visitors").uncheck();
  await savePublish();
  await page.locator(".metric-readout").waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${feed.projects.length} projects; keyboard, detail route, LTR/RTL, 320–1440px, sparse and empty data, CMS create, preview, publish, history, hide and live updates.`,
  );
} finally {
  await browser.close();
  await platform.dispose();
  await Promise.all([site.close(), dashboard.close()]);
}
