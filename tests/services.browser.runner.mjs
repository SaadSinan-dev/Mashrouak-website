import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createTestPlatform } from "./postgres-fixture.ts";
import { createPostgresPool } from "../backend/src/database.ts";
import { hash } from "../backend/src/security.ts";
const configured = parseEnv(readFileSync("backend/.env", "utf8"));
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(configured.DATABASE_URL).hostname,
  )
)
  throw new Error("Services audit reads only the intended local database");
const source = createPostgresPool(configured.DATABASE_URL);
let rows;
try {
  rows = (await source.query("SELECT * FROM content")).rows;
} finally {
  await source.end();
}
const platform = await createTestPlatform({ http: true });
for (const row of rows) {
  const columns = Object.keys(row);
  await platform.pool.query(
    `INSERT INTO content(${columns.map((column) => '"' + column + '"').join(",")}) VALUES(${columns.map((_, index) => "$" + (index + 1)).join(",")})`,
    columns.map((column) => row[column]),
  );
}
const proxy = { "/api": { target: platform.origin, changeOrigin: false } },
  publicVite = await createServer({
    configFile: "vite.config.ts",
    server: { host: "127.0.0.1", port: 0, strictPort: false, proxy },
  }),
  adminVite = await createServer({
    root: "admin-dashboard",
    configFile: "admin-dashboard/vite.config.ts",
    server: { host: "127.0.0.1", port: 0, strictPort: false, proxy },
  });
const checks = [],
  errors = [];
let browser;
const check = (value, label) => {
  assert.ok(value, label);
  checks.push(label);
};
try {
  await publicVite.listen();
  await adminVite.listen();
  const publicOrigin = `http://localhost:${publicVite.httpServer.address().port}`,
    adminOrigin = `http://localhost:${adminVite.httpServer.address().port}`;
  platform.env.PUBLIC_ORIGIN = publicOrigin;
  platform.env.ADMIN_ORIGIN = adminOrigin;
  const owner = crypto.randomUUID(),
    token = crypto.randomUUID();
  await platform.db
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,'services-proofreading@example.test','Services QA','unused','owner')",
    )
    .bind(owner)
    .run();
  await platform.db
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .bind(await hash(token), owner, Date.now() + 3600000)
    .run();
  browser = await chromium.launch({ headless: true });
  const publicContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    adminContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
  await adminContext.addCookies([
    {
      name: "mashrouak_admin",
      value: token,
      domain: "localhost",
      path: "/api",
    },
  ]);
  await adminContext.addInitScript(() =>
    localStorage.setItem("mashrouak-admin-language", "en"),
  );
  const page = await publicContext.newPage(),
    admin = await adminContext.newPage();
  for (const target of [page, admin])
    target.on("pageerror", (error) => errors.push(error.message));
  const services = rows.filter((row) => row.kind === "services");
  check(services.length === 6, "Original six service offerings preserved");
  await mkdir("artifacts/services-qa", { recursive: true });
  for (const language of ["ar", "en"]) {
    await page.addInitScript(
      (language) => localStorage.setItem("mashrouak-language", language),
      language,
    );
    await page.goto(publicOrigin + "/services");
    await page.locator(".service-detail h2").first().waitFor();
    for (const entry of services) {
      const data = JSON.parse(entry.published),
        text = await page.locator("#" + entry.published_slug).innerText();
      for (const key of ["title", "summary", "businessValue", "suitableFor"])
        assert.ok(
          text.includes(data[key][language]),
          `${language}/${entry.slug}/${key}`,
        );
      for (const key of ["includes", "deliverables"])
        for (const item of data[key])
          assert.ok(
            text.includes(item[language]),
            `${language}/${entry.slug}/${key}`,
          );
      checks.push(
        `${language}/${entry.slug}: CMS name, descriptions, inclusions and deliverables render exactly`,
      );
    }
    check(
      !(await page.locator("body").innerText()).includes("خدمmnاتنا"),
      `${language}: reported navigation typo is absent`,
    );
    check(
      (await page.locator("[data-cms-ref]").count()) === 0,
      `${language}: editor annotations add no DOM wrappers to public layout`,
    );
    await page.screenshot({
      path: `artifacts/services-qa/public-${language}.png`,
      fullPage: true,
    });
  }
  await admin.goto(adminOrigin + "/content/services");
  for (const entry of services) {
    const draft = JSON.parse(entry.draft);
    await admin
      .locator(".table-title")
      .filter({ hasText: draft.title.en })
      .click();
    const fields = admin
      .locator(".editor-bilingual")
      .first()
      .locator("textarea");
    check(
      (await fields.nth(0).inputValue()) === draft.title.ar &&
        (await fields.nth(1).inputValue()) === draft.title.en,
      `${entry.slug}: both service names match saved CMS editor values`,
    );
    await admin
      .getByRole("button", { name: "Back", exact: false })
      .first()
      .click();
  }
  await admin.goto(adminOrigin + "/settings");
  await admin.locator(".table-title").first().click();
  await admin
    .getByRole("tab", { name: "Navigation & actions", exact: true })
    .click();
  const navigation = admin
    .locator(".editor-array--navigation > .editor-array__item")
    .nth(1)
    .locator("textarea");
  check(
    (await navigation.nth(0).inputValue()) === "خدماتنا" &&
      (await navigation.nth(1).inputValue()) === "Services",
    "Corrected Arabic/English Services navigation is visible in dashboard editor",
  );
  const publishedSettings = JSON.parse(
    rows.find((row) => row.kind === "settings").published,
  );
  check(
    publishedSettings.navigation[1].label.ar === "خدماتنا",
    "Actual local published snapshot contains the exact Arabic correction",
  );
  const all = JSON.stringify(
    rows
      .filter((row) => ["services", "settings"].includes(row.kind))
      .flatMap((row) => [JSON.parse(row.draft), JSON.parse(row.published)]),
  );
  check(
    !all.includes("خدمmnاتنا") &&
      !all.includes("مقدمو الخدمات") &&
      !all.includes("catalogue") &&
      !all.includes("external service We help"),
    "Confirmed spelling, grammar and terminology issues absent from both CMS snapshots",
  );
  check(
    !errors.length,
    "Services public/dashboard console has no uncaught errors: " +
      errors.join("; "),
  );
  await writeFile(
    "artifacts/services-qa/results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(
    "PASS:",
    checks.length,
    "Services browser and CMS copy checks using an isolated clone of actual local content. Source data unchanged.",
  );
} finally {
  await browser?.close();
  await platform.dispose();
  await publicVite.close();
  await adminVite.close();
}
