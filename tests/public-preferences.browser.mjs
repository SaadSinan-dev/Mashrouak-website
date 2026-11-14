import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";
import { seedEntries } from "../backend/src/seed-content.ts";

const content = { revision: 1, updatedAt: new Date().toISOString(), entries: seedEntries.map((e,i) => ({ ...e, id: "review-" + i, sort_order: e.order })) };
const server = await createServer({ server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const origin = "http://127.0.0.1:" + server.httpServer.address().port;
const browser = await chromium.launch();
const errors = [], external = new Set();
const nativeState = page => page.evaluate(() => [document.documentElement.lang, document.documentElement.dir, document.documentElement.dataset.theme]);
async function visit(page, path="/") {
  await page.goto(origin + path, { waitUntil: "domcontentloaded" });
  await page.locator("html[data-app-route-ready=true]").waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function make(width, height, colorScheme, blockStorage=false) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme });
  if (blockStorage) await ctx.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage unavailable", "SecurityError"); } });
  });
  // The preference suite exercises navigation independently of the remote portfolio.
  await ctx.route("**/.netlify/functions/public-projects", r => r.fulfill({
    json: {version: 1, projects: []}, headers: {"access-control-allow-origin":"*"},
  }));
  await ctx.route("**/api/**", r => {
    const path = new URL(r.request().url()).pathname;
    if (path === "/api/public/content" || path === "/api/preview/test") return r.fulfill({ json: content });
    if (path === "/api/public/revision") return r.fulfill({ json: { revision: 1 } });
    if (path === "/api/public/events") return r.fulfill({ status: 204, body: "" });
    return r.fallback();
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => {
    if(msg.type() === "error") {
      const url = msg.location().url;
      if (!url || url.startsWith(origin)) errors.push(msg.text());
      else external.add(new URL(url).host);
    }
  });
  page.on("requestfailed", r => {
    if (r.failure()?.errorText === "net::ERR_ABORTED") return;
    if (r.url().startsWith(origin)) errors.push(r.failure()?.errorText + " " + new URL(r.url()).pathname);
    else external.add(new URL(r.url()).host);
  });
  page.on("response", r => {
    if (r.status() >= 400 && r.url().startsWith(origin)) errors.push(r.status() + " " + new URL(r.url()).pathname);
  });
  return page;
}
try {
  // Gate React to test the real HTML bootstrap independently of hydration.
  const first = await make(390, 844, "dark");
  let release;
  const gate = new Promise(r => release = r);
  await first.route("**/src/main.tsx", async r => { await gate; await r.continue(); });
  await first.goto(origin, { waitUntil: "commit" });
  await first.locator("#app-loader-logo[src]").waitFor();
  assert.deepEqual(await nativeState(first), ["en","ltr","dark"]);
  release();
  await first.locator("section.hero-section h1").waitFor();
  assert.deepEqual(await nativeState(first), ["en","ltr","dark"]);
  await first.emulateMedia({ colorScheme: "light" });
  await first.locator("html[data-theme=light]").waitFor();
  assert.equal(await first.evaluate(() => localStorage.getItem("mashrouak-theme")), null);
  const stack = first.locator(".site-header__preferences"), theme = stack.locator(".preference-control--theme"), language = stack.locator(".preference-control--language");
  await theme.click();
  await language.click();
  await first.emulateMedia({ colorScheme: "dark" });
  await first.emulateMedia({ colorScheme: "light" });
  await visit(first);
  assert.deepEqual(await nativeState(first), ["ar","rtl","dark"]);
  const widths = [[320,568],[390,844],[640,360],[820,960],[1024,768],[1440,900]];
  for (const [w,h] of widths) {
    await first.setViewportSize({width:w,height:h});
    for (const lang of ["ar","en"]) {
      if ((await nativeState(first))[0] !== lang) await language.click();
      assert.deepEqual((await nativeState(first)).slice(0,2), [lang,lang === "ar" ? "rtl":"ltr"]);
      assert.equal(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true, "page overflow at " + w);
      if (w <= 1100) {
        const a = await theme.boundingBox(), b = await language.boundingBox(), logo = await first.locator(".site-header__brand .brand-lockup").boundingBox();
        assert.ok(a.x > w / 2 && a.x === b.x && a.y + a.height <= b.y + 1 && a.width === b.width && a.height === b.height && a.height >= 44);
        assert.ok(logo.x + logo.width <= a.x);
      }
    }
  }
  await first.setViewportSize({width:390,height:844});
  const menu = first.locator(".mobile-menu-trigger");
  await menu.focus();
  await first.keyboard.press("Enter");
  const dialog = first.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.locator(".preference-control").count(),0);
  await first.keyboard.press("Escape");
  await dialog.waitFor({state:"detached"});
  assert.equal(await menu.evaluate(n => n === document.activeElement),true);
  await first.emulateMedia({reducedMotion:"reduce"});
  await first.locator(".hero-visual--fallback").waitFor();
  assert.equal(await first.locator(".product-scene canvas").count(),0);
  for (const lang of ["en","ar"]) {
    if ((await nativeState(first))[0] !== lang) await language.click();
    await menu.click();
    await dialog.waitFor();
    const links=await dialog.locator("nav a").evaluateAll(els=>els.map(n=>n.getAttribute("href")));
    for (const href of links) {
      assert.equal(await dialog.locator('nav a[href="'+href+'"]').evaluate(el=>getComputedStyle(el).opacity), "1");
      await dialog.locator('nav a[href="'+href+'"]').click();
      await first.waitForURL(origin + (href === "/" ? "/" : href));
      await dialog.waitFor({state:"detached"});
      await first.locator("main h1").first().waitFor();
      await menu.click();
    }
    await first.keyboard.press("Escape");
    await dialog.waitFor({state:"detached"});
  }
  await visit(first);
  for (const [selector,path] of [[".hero-section__secondary","/work"],[".hero-section__actions .button","/contact"]]) {
    await first.locator(selector).click(); await first.waitForURL(origin+path); await first.goBack(); await first.locator("section.hero-section h1").waitFor();
  }
  await visit(first,"/?preview=test&preview_language=en&preview_theme=light");
  assert.deepEqual(await nativeState(first),["en","ltr","light"]);
  assert.equal(await first.evaluate(()=>localStorage.getItem("mashrouak-language")),"ar");
  await first.context().close();
  const blocked=await make(320,640,"light",true);
  await visit(blocked,"/about");
  assert.deepEqual(await nativeState(blocked),["en","ltr","light"]);
  await blocked.locator(".preference-control--theme").click();
  assert.deepEqual(await nativeState(blocked),["en","ltr","dark"]);
  await blocked.context().close();
  const unknown = await make(390,844,"no-preference");
  await unknown.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = q => original(q.includes("prefers-color-scheme") ? "not all" : q);
  });
  await visit(unknown,"/about");
  assert.deepEqual(await nativeState(unknown),["en","ltr","dark"]);
  assert.deepEqual(errors,[]);
  console.log("Passed first paint, system changes, persistence, blocked storage, preview, unknown theme, six viewport sizes, two directions, drawer keyboard and all navigation/hero links.");
  if (external.size) console.log("External network failures observed:", [...external].join(", "));
} finally {
  await browser.close(); await server.close();
}
