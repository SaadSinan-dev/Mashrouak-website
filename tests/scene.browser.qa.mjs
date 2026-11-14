import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

export async function sceneChecks(
  browser,
  origin,
  content,
  onProgress = () => {},
) {
  const checks = [],
    errors = [],
    contexts = [];
  const dir = "artifacts/3d-audit";
  await mkdir(dir, { recursive: true });
  const check = (value, label) => {
    assert.ok(value, label);
    checks.push(label);
  };
  const make = async ({
    language = "en",
    theme = "dark",
    width = 1440,
    reducedMotion = "no-preference",
  } = {}) => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion,
    });
    contexts.push(context);
    await context.addInitScript(
      ({ language, theme }) => {
        localStorage.setItem("mashrouak-language", language);
        localStorage.setItem("mashrouak-theme", theme);
        window.sceneStates = [];
        new MutationObserver(() => {
          const host = document.querySelector("[data-scene-state]");
          if (host)
            window.sceneStates.push({
              phase: host.dataset.sceneState,
              canvases: host.querySelectorAll("canvas").length,
              skeletons: host.querySelectorAll(".hero-scene-skeleton").length,
            });
        }).observe(document, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["data-scene-state"],
        });
      },
      { language, theme },
    );
    await context.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/public/content")
        return route.fulfill({ json: content });
      if (path === "/api/public/revision")
        return route.fulfill({ json: { revision: content.revision } });
      if (path === "/api/public/events")
        return route.fulfill({
          contentType: "text/event-stream",
          body: ": test\n\n",
        });
      if (path === "/api/chat/session")
        return route.fulfill({ json: { conversation: null } });
      return route.fulfill({ json: {}, status: 404 });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /THREE|WebGL|shader/i.test(message.text())
      )
        errors.push(message.text());
    });
    return { context, page };
  };
  const open = async (page, path = "/") =>
    page.goto(origin + path, { waitUntil: "domcontentloaded" });
  const idle = async (page) => {
    await page.locator(".hero-visual[data-scene-state=ready]").waitFor();
    await page.locator("canvas[data-motion=idle]").waitFor();
  };
  try {
    // Full route inventory: only the homepage owns 3D. Case illustrations are HTML/CSS.
    const routePage = (await make()).page;
    const routes = [
      "/",
      "/services",
      "/work",
      "/about",
      "/process",
      "/contact",
      "/results",
      "/privacy",
      "/terms",
      "/pages/about",
      "/missing-audit-route",
      "/contact/chat",
      ...content.entries
        .filter((e) => e.kind === "projects")
        .map((e) => "/work/" + e.slug),
    ];
    for (const route of routes) {
      onProgress(`Auditing ${route}`);
      await open(routePage, route);
      if (route === "/") await idle(routePage);
      else if (route === "/contact/chat")
        await routePage.locator(".chat-shell").waitFor();
      else
        await routePage.locator('html[data-app-route-ready="true"]').waitFor();
      check(
        (await routePage.locator(".product-scene canvas").count()) ===
          (route === "/" ? 1 : 0),
        `Route inventory ${route}: expected 3D ownership`,
      );
    }

    for (const language of ["ar", "en"])
      for (const theme of ["light", "dark"])
        for (const width of [390, 820, 1440]) {
          onProgress(`Checking ${language}/${theme}/${width}`);
          const { page, context } = await make({ language, theme, width });
          await open(page);
          await idle(page);
          const states = await page.evaluate(() => window.sceneStates);
          check(
            states.some((s) => s.phase === "rendering") &&
              states.some((s) => s.phase === "ready"),
            `${language}/${theme}/${width}: rendering precedes ready`,
          );
          check(
            states.every(
              (s) =>
                s.canvases <= 1 && (s.phase === "loading" || s.skeletons === 0),
            ),
            `${language}/${theme}/${width}: no stacked placeholders or canvases`,
          );
          check(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${language}/${theme}/${width}: responsive viewport fit`,
          );
          check(
            (await page.locator(".hero-node").count()) === 0,
            `${language}/${theme}/${width}: no fallback underneath the model`,
          );
          await page.locator(".hero-visual").scrollIntoViewIfNeeded();
          await page
            .locator(".hero-visual")
            .screenshot({ path: `${dir}/${language}-${theme}-${width}.png` });
          const initialCanvas = await page.locator(".product-scene canvas").elementHandle();
          if (width === 1440) {
            await page.locator(".preference-control--theme").first().click();
            await page
              .locator(
                `canvas[data-theme=${theme === "dark" ? "light" : "dark"}][data-motion=idle]`,
              )
              .waitFor();
            check(
              await initialCanvas.evaluate(
                (node) =>
                  node === document.querySelector(".product-scene canvas"),
              ),
              `${language}/${theme}: theme switch retains one renderer`,
            );
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page
              .locator(".hero-visual[data-scene-state=fallback]")
              .waitFor();
            check(
              (await page.locator(".product-scene canvas").count()) === 0,
              `${language}/${theme}: changing reduced motion releases WebGL`,
            );
            await page.emulateMedia({ reducedMotion: "no-preference" });
            await idle(page);
            check(
              (await page.locator(".product-scene canvas").count()) === 1,
              `${language}/${theme}: disabling reduced motion starts one clean scene`,
            );
          }
          await context.close();
        }

    onProgress("Checking loading placeholders and interrupted preparation");
    const { page: loadingPage } = await make({ theme: "light" });
    let releaseModule;
    const moduleGate = new Promise((resolve) => {
      releaseModule = resolve;
    });
    await loadingPage.route("**/ProductScene.tsx*", async (route) => {
      await moduleGate;
      await route.continue();
    });
    await open(loadingPage);
    await loadingPage
      .locator(
        ".hero-visual[data-scene-state=loading] .hero-scene-skeleton svg",
      )
      .waitFor();
    check(
      (await loadingPage.locator(".product-scene canvas").count()) === 0,
      "Model preparation displays one complete structural placeholder before WebGL loads",
    );
    await loadingPage
      .locator(".hero-visual")
      .screenshot({ path: `${dir}/loading-light.png` });
    await loadingPage.locator(".preference-control--theme").first().click();
    await loadingPage
      .locator(".hero-visual")
      .screenshot({ path: `${dir}/loading-dark.png`, animations: "disabled" });
    releaseModule();
    await idle(loadingPage);
    check(
      (await loadingPage.locator(".hero-scene-skeleton").count()) === 0,
      "The placeholder is removed after real rendering begins",
    );

    onProgress("Checking failed assets and context recovery");
    const { page: failurePage } = await make();
    await failurePage.route("**/brand/logo-horizontal-en-colour.png", (route) =>
      route.abort(),
    );
    await open(failurePage);
    await failurePage.locator(".hero-visual[data-scene-state=error]").waitFor();
    check(
      (await failurePage.locator(".hero-node").count()) === 3 &&
        (await failurePage.locator(".product-scene canvas").count()) === 0,
      "Asset failure removes renderer and preserves a static illustration",
    );
    await failurePage.unroute("**/brand/logo-horizontal-en-colour.png");
    await failurePage
      .locator(".hero-visual")
      .getByRole("button", { name: "Retry", exact: true })
      .click();
    await idle(failurePage);
    check(
      (await failurePage.locator(".product-scene canvas").count()) === 1,
      "Asset retry creates exactly one complete renderer",
    );
    await failurePage
      .locator(".product-scene canvas")
      .evaluate((canvas) =>
        canvas
          .getContext("webgl2")
          .getExtension("WEBGL_lose_context")
          .loseContext(),
      );
    await failurePage.locator(".hero-visual[data-scene-state=error]").waitFor();
    check(
      (await failurePage.locator(".product-scene canvas").count()) === 0,
      "Context loss removes the incomplete renderer immediately",
    );
    await failurePage
      .locator(".hero-visual")
      .getByRole("button", { name: "Retry", exact: true })
      .click();
    await idle(failurePage);
    check(
      (await failurePage.locator(".product-scene canvas").count()) === 1,
      "Context-loss retry recovers one complete model",
    );
    // SPA navigation repeatedly tears down and recreates the shared scene.
    for (let cycle = 0; cycle < 3; cycle++) {
      await failurePage
        .locator('.site-header a[href="/about"]')
        .first()
        .click();
      await failurePage.waitForURL("**/about");
      await failurePage
        .locator(".product-scene canvas")
        .waitFor({ state: "detached" });
      check(
        (await failurePage.locator(".product-scene canvas").count()) === 0,
        `Navigation cycle ${cycle + 1}: scene removed`,
      );
      await failurePage.locator('.site-header a[href="/"]').first().click();
      await failurePage.waitForURL(origin + "/");
      await idle(failurePage);
      check(
        (await failurePage.locator(".product-scene canvas").count()) === 1,
        `Navigation cycle ${cycle + 1}: no duplicate remount`,
      );
    }

    onProgress(
      "Checking independent scenes and partial initialization cleanup",
    );
    const { page: harness } = await make();
    await open(harness, "/tests/product-scene.harness.html");
    await harness.waitForFunction(() => window.sceneHarness);
    await harness.evaluate(() => {
      window.sceneHarness.mount("dark", "en");
      window.sceneHarness.mount("light", "ar");
    });
    const samples = await harness.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          const sample = () => {
            const snapshots = window.sceneHarness.snapshots();
            samples.push(snapshots);
            if (snapshots.every((s) => s.progress === 1)) resolve(samples);
            else requestAnimationFrame(sample);
          };
          sample();
        }),
    );
    for (let i = 0; i < 2; i++) {
      const rendering = samples
        .map((s) => s[i])
        .filter((s) => s.status.phase === "rendering");
      check(
        rendering.length > 2 &&
          rendering.every(
            (s, j) => s.progress >= (rendering[j - 1]?.progress ?? 0),
          ),
        `Instance ${i + 1}: measured reveal progresses monotonically`,
      );
      check(
        rendering.every(
          (s) =>
            JSON.stringify(s.camera) === JSON.stringify(rendering[0].camera) &&
            JSON.stringify(s.position) ===
              JSON.stringify(rendering[0].position),
        ),
        `Instance ${i + 1}: camera and model stay fixed during reveal`,
      );
    }
    await harness.waitForFunction(() =>
      window.sceneHarness
        .snapshots()
        .every((s) => s.status.phase === "ready" && !s.pendingFrame),
    );
    const snapshots = await harness.evaluate(() =>
      window.sceneHarness.snapshots(),
    );
    check(
      snapshots.every(
        (s) =>
          s.meshes === 37 &&
          s.geometries === 21 &&
          s.screenSurfaces === 2 &&
          s.glassSurfaces === 2,
      ),
      "Both models use one artwork surface and one original optical glass surface per screen",
    );
    check(
      snapshots.every((s) => s.calls === 37),
      "Measured steady-state draw calls are 37 per scene (original 39)",
    );
    await harness.evaluate(() => {
      window.sceneHarness.instances[0].update("ar", "light");
      window.sceneHarness.instances[1].update("en", "dark");
    });
    await harness.waitForFunction(
      () =>
        document.querySelectorAll("canvas[data-logo-asset]")[0]?.dataset
          .logoAsset === "logo-horizontal" &&
        document.querySelectorAll("canvas[data-logo-asset]")[1]?.dataset
          .logoAsset === "logo-horizontal-en" &&
        window.sceneHarness.snapshots().every((s) => !s.pendingFrame),
    );
    const refreshed = await harness.evaluate(() =>
      window.sceneHarness.snapshots(),
    );
    check(
      refreshed.every(
        (s, i) =>
          s.geometries === snapshots[i].geometries &&
          s.materials === snapshots[i].materials &&
          s.textures === snapshots[i].textures,
      ),
      "Theme/language updates do not create additional meshes or retained resources",
    );
    await harness.evaluate(() => window.sceneHarness.instances[0].dispose());
    check(
      (await harness.locator("canvas").count()) === 1,
      "Disposing one instance leaves the other independent instance intact",
    );
    await harness.evaluate(() => window.sceneHarness.dispose());
    check(
      (await harness.locator("canvas").count()) === 0 &&
        (await harness.evaluate(() =>
          window.sceneHarness
            .snapshots()
            .every((s) => s.disposed && !s.pendingFrame),
        )),
      "Disposal removes all canvases and stops every owned animation loop",
    );
    await harness.evaluate(() => {
      const Original = window.ResizeObserver;
      window.ResizeObserver = class {
        constructor() {
          throw new Error("test partial initialization failure");
        }
      };
      window.sceneHarness.mount();
      window.ResizeObserver = Original;
    });
    check(
      (await harness.locator("canvas").count()) === 0 &&
        (await harness.evaluate(
          () => window.sceneHarness.snapshots().at(-1).disposed,
        )),
      "Partial initialization failure releases acquired resources",
    );
    check(!errors.length, "No uncaught application or Three.js shader errors: " + errors.join("; "));
    await writeFile(
      `${dir}/rendering-results.json`,
      JSON.stringify({ checks, errors, metrics: snapshots }, null, 2),
    );
    return checks;
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
}
