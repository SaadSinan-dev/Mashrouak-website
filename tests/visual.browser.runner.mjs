import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { createTestPlatform } from "./postgres-fixture.ts";
import { hash } from "../backend/src/security.ts";
// Real Hono HTTP, PostgreSQL transactions, and two independent applications.
const platform = await createTestPlatform({ http: true, seed: true });
const proxy = { "/api": { target: platform.origin, changeOrigin: false } };
const publicVite = await createServer({
  configFile: "vite.config.ts",
  server: { host: "127.0.0.1", port: 0, strictPort: false, proxy },
});
const adminVite = await createServer({
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
  adminVite.config.env.VITE_PUBLIC_URL = `http://localhost:${publicVite.httpServer.address().port}`;
  await adminVite.listen();
  const publicOrigin = `http://localhost:${publicVite.httpServer.address().port}`,
    adminOrigin = `http://localhost:${adminVite.httpServer.address().port}`;
  platform.env.PUBLIC_ORIGIN = publicOrigin;
  platform.env.ADMIN_ORIGIN = adminOrigin;
  const owner = crypto.randomUUID(),
    token = crypto.randomUUID();
  await platform.db
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,'publish-qa@example.test','Publishing QA','unused','owner')",
    )
    .bind(owner)
    .run();
  await platform.db
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .bind(await hash(token), owner, Date.now() + 3600000)
    .run();
  const customId = crypto.randomUUID(),
    bi = (value) => ({ ar: value, en: value });
  const customData = {
    title: bi("Editor QA page"),
    description: bi("Draft-only editor checks"),
    seoTitle: bi(""),
    seoDescription: bi(""),
    sections: [
      {
        id: "story",
        kind: "text",
        visible: true,
        background: "default",
        title: bi("Story heading"),
        body: bi("Original body"),
        image: null,
        buttonLabel: bi("Contact"),
        buttonUrl: "/contact",
      },
    ],
  };
  await platform.db
    .prepare(
      "INSERT INTO content(id,kind,slug,sort_order,status,draft,updated_at) VALUES(?,'pages','editor-qa',20,'draft',?,now())",
    )
    .bind(customId, JSON.stringify(customData))
    .run();
  const form = new FormData();
  form.set(
    "file",
    new File(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      "editor-qa.png",
      { type: "image/png" },
    ),
  );
  form.set("alt_ar", "صورة المحرر");
  form.set("alt_en", "Editor image");
  form.set("visibility", "public");
  const uploaded = await platform.dispatchFetch("http://localhost/api/media", {
    method: "POST",
    headers: {
      Origin: adminOrigin,
      Cookie: `mashrouak_admin=${token}`,
      "X-Mashrouak-Request": "1",
    },
    body: form,
  });
  assert.equal(uploaded.status, 201);

  browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    normalContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
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
  const admin = await adminContext.newPage(),
    normal = await normalContext.newPage();
  for (const page of [admin, normal]) {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 400)
        errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
  }

  await admin.goto(adminOrigin + "/visual");
  const preview = admin.frameLocator("iframe");
  await preview.locator("main h1").waitFor();
  await admin.locator(".visual-element").first().waitFor();
  console.log("EDITOR_READY", await preview.locator("main h1").innerText());
  await mkdir("artifacts/visual-qa", { recursive: true });
  await admin.screenshot({
    path: "artifacts/visual-qa/editor-initial.png",
    fullPage: true,
  });
  await preview.locator("main h1 [data-cms-ref]").first().click();
  await admin.locator(".visual-inspector textarea").first().waitFor();
  console.log("SELECTED", await admin.locator(".visual-inspector").innerText());
  await admin
    .locator(".visual-inspector textarea")
    .nth(1)
    .fill("Visual editor preview heading");
  await preview
    .locator("main h1")
    .filter({ hasText: "Visual editor preview heading" })
    .waitFor();
  checks.push(
    "Exact heading click identifies bilingual CMS field and live preview updates",
  );
  await admin.getByRole("button", { name: "Undo", exact: true }).click();
  await preview
    .locator("main h1")
    .filter({ hasNotText: "Visual editor preview heading" })
    .waitFor();
  checks.push("Undo restores preview");
  await admin.getByRole("button", { name: "Redo", exact: true }).click();
  await preview
    .locator("main h1")
    .filter({ hasText: "Visual editor preview heading" })
    .waitFor();
  checks.push("Redo restores edit");
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByText("Private draft saved", { exact: true }).waitFor();
  checks.push(
    "Visual editor saves private draft through real PostgreSQL transaction",
  );
  const before = await (
    await fetch(platform.origin + "/api/public/content")
  ).json();
  check(
    !JSON.stringify(before).includes("Visual editor preview heading"),
    "Visual draft stays absent from anonymous API",
  );
  await admin
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await admin
    .getByText("Published and public snapshot verified", { exact: true })
    .waitFor();
  const after = await (
    await fetch(platform.origin + "/api/public/content")
  ).json();
  check(
    JSON.stringify(after).includes("Visual editor preview heading"),
    "Visual publish commits and public verification succeeds",
  );
  await admin
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();
  await admin
    .getByRole("link", { name: "Open private preview", exact: false })
    .waitFor();
  checks.push("Saved draft preview uses expiring server token");
  check(
    !after.entries.some((entry) => entry.id === customId),
    "Publishing edited settings does not promote an unrelated existing draft",
  );
  await admin.getByRole("button", { name: "Hide hero", exact: true }).click();
  await preview
    .locator("[data-section-id=hero]")
    .waitFor({ state: "detached" });
  checks.push("Section visibility updates the actual public preview");
  await admin.getByRole("button", { name: "Undo", exact: true }).click();
  await preview.locator("[data-section-id=hero]").waitFor();
  await admin
    .getByRole("button", { name: "Move hero down", exact: true })
    .click();
  await preview
    .locator("main > [data-section-id=challenges]")
    .first()
    .waitFor();
  check(
    (await preview
      .locator("main > [data-section-id]")
      .first()
      .getAttribute("data-section-id")) === "challenges",
    "Section ordering follows CMS order in actual components",
  );
  await admin.getByRole("button", { name: "Undo", exact: true }).click();
  await admin
    .getByLabel("hero background", { exact: true })
    .selectOption("mist");
  await preview.locator("[data-section-id=hero].cms-slot--mist").waitFor();
  checks.push("Supported section background changes without custom CSS");
  await admin.getByRole("button", { name: "Undo", exact: true }).click();
  await admin.getByRole("button", { name: "English", exact: true }).click();
  await preview.locator("html[lang=ar]").waitFor();
  checks.push("Arabic preview switches direction and uses the same components");
  await admin.getByRole("button", { name: "العربية", exact: true }).click();
  await preview.locator("html[lang=en]").waitFor();
  for (const [device, width] of [
    ["tablet", 768],
    ["mobile", 390],
    ["desktop", 1440],
  ]) {
    await admin.getByRole("button", { name: device, exact: true }).click();
    check(
      (await preview.locator("html").evaluate(() => innerWidth)) === width,
      `${device} preview uses actual ${width}px viewport`,
    );
  }
  await admin
    .getByRole("button", { name: "Revision history", exact: true })
    .click();
  await admin.locator(".visual-history button").first().click();
  await admin
    .getByText("Revision restored as a private draft", { exact: true })
    .waitFor();
  check(
    JSON.stringify(
      await (await fetch(platform.origin + "/api/public/content")).json(),
    ).includes("Visual editor preview heading"),
    "Revision restore stays private until a later explicit publication",
  );
  await admin
    .getByLabel("Preview page", { exact: true })
    .selectOption("/pages/editor-qa");
  await preview.locator("#story .rich-text").waitFor();
  await preview.locator("#story .rich-text").click();
  const rich = admin.locator(".visual-inspector .rich-text-editor").nth(1);
  await rich
    .locator("textarea")
    .fill(
      "Bold and *italic*\n\n- First item\n- Second item\n\n[Contact](/contact)\n\n<script>window.__visualXss=true</script>\n\n[Unsafe](javascript:alert(1))",
    );
  await rich
    .locator("textarea")
    .evaluate((element) => element.setSelectionRange(0, 4));
  await rich.getByRole("button", { name: "Bold", exact: true }).click();
  await preview.locator("#story strong").filter({ hasText: "Bold" }).waitFor();
  await preview.locator("#story em").filter({ hasText: "italic" }).waitFor();
  check(
    (await preview.locator("#story .rich-text li").count()) === 2,
    "Rich text toolbar, italic, paragraphs and lists render through safe Markdown",
  );
  check(
    (await preview.locator('#story .rich-text a[href="/contact"]').count()) ===
      1 &&
      (await preview.locator('#story a[href^="javascript:"]').count()) === 0,
    "Rich text preserves safe links and removes unsafe protocols",
  );
  check(
    await preview.locator("html").evaluate(() => !window.__visualXss),
    "Rich text raw HTML cannot execute scripts",
  );
  await admin.locator(".visual-library > summary").click();
  await admin
    .locator(".visual-library summary")
    .filter({ hasText: "pages / editor-qa" })
    .click();
  await admin
    .locator(".visual-library .visual-element")
    .filter({ hasText: "Image / editor-qa" })
    .first()
    .click();
  await admin
    .getByRole("button", {
      name: "Choose an image from the library",
      exact: true,
    })
    .click();
  await admin.locator(".media-choice button").first().click();
  await admin
    .locator(".visual-inspector textarea")
    .nth(1)
    .fill("Accessible editor image");
  await preview.locator('#story img[alt="Accessible editor image"]').waitFor();
  checks.push(
    "Image picker and bilingual alternative text update the actual preview",
  );
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByText("Private draft saved", { exact: true }).waitFor();
  const newPreview = admin.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/visual/preview") &&
      response.request().method() === "POST",
  );
  await admin
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();
  await newPreview;
  const privateUrl = await admin
    .getByRole("link", { name: "Open private preview", exact: false })
    .getAttribute("href");
  check(
    new URL(privateUrl).origin === publicOrigin &&
      new URL(privateUrl).pathname === "/pages/editor-qa",
    "Preview action replaces the previous page link with the latest saved route",
  );
  const tokenValue = new URL(privateUrl).searchParams.get("preview"),
    privateData = await (
      await fetch(platform.origin + "/api/preview/" + tokenValue)
    ).json();
  console.log("PRIVATE_SNAPSHOT_DIAGNOSTIC", {
    route: new URL(privateUrl).pathname,
    language: new URL(privateUrl).searchParams.get("preview_language"),
    body: privateData.entries.find((entry) => entry.id === customId)?.data
      .sections[0].body,
  });
  await normal.goto(privateUrl);
  await normal.locator("#story").waitFor();
  console.log("PRIVATE_BROWSER_DIAGNOSTIC", {
    language: await normal.locator("html").getAttribute("lang"),
    body: await normal.locator("#story").innerText(),
  });
  await normal.screenshot({
    path: "artifacts/visual-qa/private-preview-diagnostic.png",
    fullPage: true,
  });
  await normal.locator("#story strong").filter({ hasText: "Bold" }).waitFor();
  checks.push(
    "Expiring preview URL renders the saved multi-entry draft in a separate public session",
  );
  check(
    !(
      await (await fetch(platform.origin + "/api/public/content")).json()
    ).entries.some((entry) => entry.id === customId),
    "Custom-page rich text and image draft remain absent from anonymous public snapshot",
  );

  await admin.getByRole("button", { name: "mobile", exact: true }).click();
  await admin.screenshot({
    path: "artifacts/visual-qa/editor-mobile.png",
    fullPage: true,
  });
  check(
    (await preview.locator("main h1").count()) === 1,
    "Mobile preview renders actual public component once",
  );
  await admin.getByRole("button", { name: "desktop", exact: true }).click();
  await admin.getByRole("button", { name: "Select", exact: true }).click();
  await preview.locator('.site-header a[href="/services"]').first().click();
  await preview.locator(".service-detail").first().waitFor();
  check(
    (await admin.getByLabel("Preview page", { exact: true }).inputValue()) ===
      "/services",
    "Interaction navigation keeps preview and page navigator synchronized",
  );
  await preview.locator('.site-header a[href="/contact"]').first().click();
  await preview.locator("form.contact-form").waitFor();
  await preview.locator("form.contact-form button[type=submit]").click();
  await admin
    .getByText(
      "Use the public website to send an enquiry; preview forms do not submit.",
      { exact: true },
    )
    .waitFor();
  checks.push("Editor preview prevents sending real forms");
  const standalone = await normalContext.newPage();
  await standalone.goto(adminOrigin + "/preview/index.html");
  await standalone
    .getByText(
      "Open this preview from the authenticated Visual Website Editor.",
    )
    .waitFor();
  checks.push("Standalone preview exposes no draft content");
  check(
    !errors.length,
    "Visual editor has no browser or API errors: " + errors.join("; "),
  );
  await admin.screenshot({
    path: "artifacts/visual-qa/editor-final.png",
    fullPage: true,
  });
  await writeFile(
    "artifacts/visual-qa/results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log("PASS:", checks.length, "visual editor browser checks");
} finally {
  await browser?.close();
  await platform.dispose();
  await publicVite.close();
  await adminVite.close();
}
