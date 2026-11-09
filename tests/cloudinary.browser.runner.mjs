import { chromium } from "playwright";
import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
import { createMediaBrowserFixture } from "./cloudinary.browser-fixture.ts";
import { mediaBrowserChecks } from "./cloudinary.browser.qa.mjs";
const vite = await createServer({
  root: "admin-dashboard",
  configFile: "admin-dashboard/vite.config.ts",
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
let fixture, browser;
try {
  await vite.listen();
  const address = vite.httpServer.address();
  const adminOrigin = `http://localhost:${address.port}`;
  fixture = await createMediaBrowserFixture(adminOrigin);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addCookies([
    {
      name: "mashrouak_admin",
      value: fixture.token,
      domain: "localhost",
      path: "/api",
    },
  ]);
  const page = await context.newPage();
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: fixture.origin + url.pathname + url.search,
      }),
    });
  });
  const checks = await mediaBrowserChecks(page, {
    adminOrigin,
    backendOrigin: fixture.origin,
  });
  await writeFile(
    "artifacts/cloudinary-qa/results.json",
    JSON.stringify(checks, null, 2),
  );
  console.log(
    `PASS: ${checks.length} media browser checks; isolated real PostgreSQL, mocked Cloudinary; screenshots in artifacts/cloudinary-qa`,
  );
} finally {
  await browser?.close();
  await fixture?.platform.dispose();
  await vite.close();
}
