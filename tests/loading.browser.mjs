import assert from "node:assert/strict";
export async function contextFor(browser, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: "http://127.0.0.1:8790" + url.pathname + url.search,
    });
    await route.fulfill({ response });
  });
  return context;
}
export async function pipeline(
  browser,
  {
    admin = false,
    order = "code",
    width = 1440,
    language = "ar",
    theme = "light",
    credentials,
  } = {},
) {
  const context = await contextFor(browser, {
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.addInitScript(
    ({ admin, language, theme }) => {
      localStorage.setItem(
        admin ? "mashrouak-admin-language" : "mashrouak-language",
        language,
      );
      localStorage.setItem(
        admin ? "mashrouak-admin-theme" : "mashrouak-theme",
        theme,
      );
    },
    { admin, language, theme },
  );
  try {
    if (admin) {
      await page.goto("http://localhost:5174");
      await page.locator("input[type=email]").fill(credentials.email);
      await page.locator("input[type=password]").fill(credentials.password);
      await page
        .locator(".login-card button[type=submit],.login-card .admin-button")
        .click();
      await page.locator(".admin-shell").waitFor();
    }
    let codeRelease, apiRelease, codeStarted, apiStarted;
    let calls = 0;
    const codeGate = new Promise((resolve) => (codeRelease = resolve)),
      apiGate = new Promise((resolve) => (apiRelease = resolve)),
      codeSeen = new Promise((resolve) => (codeStarted = resolve)),
      apiSeen = new Promise((resolve) => (apiStarted = resolve));
    await page.route(
      admin ? "**/ContentManager.tsx*" : "**/PortfolioPage.tsx*",
      async (route) => {
        codeStarted();
        await codeGate;
        await route.fallback();
      },
    );
    await page.route(
      admin ? "**/api/admin/content*" : "**/api/public/content*",
      async (route) => {
        calls++;
        apiStarted();
        await apiGate;
        await route.fallback().catch(() => {});
      },
    );
    await page.goto(
      admin
        ? "http://localhost:5174/content/pages"
        : "http://localhost:5173/work",
    );
    const deadline = setTimeout(() => {
      codeRelease();
      apiRelease();
    }, 7000);
    await Promise.all([codeSeen, apiSeen]);
    const selector = admin
      ? "#admin-main>.skeleton-region"
      : "#main-content>.sk-public-page";
    await page.locator(selector).waitFor();
    await page.evaluate((selector) => {
      window.__initialWireframe = document.querySelector(selector);
    }, selector);
    if (order === "code") codeRelease();
    else apiRelease();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.ok(
      await page.evaluate(
        (selector) =>
          document.querySelector(selector) === window.__initialWireframe,
        selector,
      ),
      "The initial wireframe must keep the same DOM owner while either request is pending",
    );
    codeRelease();
    apiRelease();
    clearTimeout(deadline);
    await page.locator(selector).waitFor({ state: "detached" });
    await page.locator(admin ? ".admin-table" : ".portfolio-grid").waitFor();
    assert.equal(
      await page.locator("main [aria-busy=true]").count(),
      0,
      "No second page or region skeleton after readiness",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Responsive content fits",
    );
    assert.deepEqual(errors, []);
    if (admin)
      assert.equal(calls, 1, "Prefetch and mounted editor share one API call");
    return {
      admin,
      order,
      width,
      language,
      theme,
      calls,
      sameOwner: true,
      noSecondSkeleton: true,
      errors,
    };
  } finally {
    await context.close();
  }
}
