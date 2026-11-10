import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// Instrument only this canvas/clock, keeping the production renderer free of test hooks.
function probe() {
  const data = (window.__networkProbe = {
    pending: 0,
    maxPending: 0,
    frames: [],
    costs: [],
  });
  const pending = new Set();
  const raf = window.requestAnimationFrame.bind(window),
    cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    if (!callback.toString().includes("adaptiveFps")) return raf(callback);
    const id = raf((time) => {
      pending.delete(id);
      data.pending = pending.size;
      const start = performance.now(),
        count = data.frames.length;
      callback(time);
      if (data.frames.length !== count)
        data.costs.push(performance.now() - start);
    });
    pending.add(id);
    data.pending = pending.size;
    data.maxPending = Math.max(data.maxPending, data.pending);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    pending.delete(id);
    data.pending = pending.size;
    cancel(id);
  };
  let current;
  for (const method of ["clearRect", "fillText", "stroke"]) {
    const original = CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method] = function (...args) {
      if (this.canvas.classList.contains("public-atmosphere__network")) {
        if (method === "clearRect") {
          current = {
            at: performance.now(),
            glyphs: [],
            pulses: [],
            connections: 0,
          };
          data.frames.push(current);
        } else if (current && method === "fillText")
          current.glyphs.push(args.slice(0, 3));
        else if (current && this.getLineDash().length)
          current.pulses.push(this.lineDashOffset);
        else if (current && Math.abs(this.lineWidth - 0.7) < 0.01)
          current.connections++;
      }
      return original.apply(this, args);
    };
  }
}

export async function networkChecks(
  browser,
  origin,
  content,
  progress = () => {},
) {
  const checks = [],
    errors = [],
    contexts = [];
  const dir = "artifacts/live-network";
  await mkdir(dir, { recursive: true });
  const check = (value, label) => {
    assert.ok(value, label);
    checks.push(label);
  };
  const make = async (
    width = 1440,
    height = 960,
    theme = "light",
    language = "en",
    extra = {},
  ) => {
    const context = await browser.newContext({
      viewport: { width, height },
      ...extra,
    });
    contexts.push(context);
    await context.addInitScript(probe);
    await context.addInitScript(
      ({ theme, language }) => {
        localStorage.setItem("mashrouak-theme", theme);
        localStorage.setItem("mashrouak-language", language);
      },
      { theme, language },
    );
    await context.route("**/api/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path === "/api/public/content") return r.fulfill({ json: content });
      if (path === "/api/public/revision")
        return r.fulfill({ json: { revision: content.revision } });
      if (path === "/api/public/events")
        return r.fulfill({ contentType: "text/event-stream", body: ":qa\n\n" });
      if (path === "/api/chat/session")
        return r.fulfill({ json: { conversation: null } });
      return r.fulfill({ status: 404, json: {} });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    return page;
  };
  const open = async (page, path) => {
    await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    await page
      .locator(
        path === "/contact/chat"
          ? ".chat-shell"
          : 'html[data-app-route-ready="true"]',
      )
      .waitFor();
    await page.locator(".public-atmosphere[data-ready]").waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
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
    "/network-qa-missing",
    "/contact/chat",
    ...content.entries
      .filter((e) => e.kind === "projects")
      .map((e) => "/work/" + e.slug),
  ];
  const summary = { routes: [], motion: [], performance: null };
  try {
    for (const [width, height, language] of [
      [1440, 960, "en"],
      [820, 1000, "ar"],
      [390, 844, "ar"],
    ])
      for (const theme of ["light", "dark"]) {
        progress(`Checking ${width}px ${theme} routes`);
        const page = await make(width, height, theme, language, {
          deviceScaleFactor: width < 640 ? 2 : 1,
        });
        for (const path of routes) {
          await open(page, path);
          const metrics = await page.evaluate(() => {
            const host = document.querySelector(".public-atmosphere"),
              canvas = host.querySelector("canvas");
            const r = host.getBoundingClientRect();
            return {
              count: document.querySelectorAll(".public-atmosphere canvas")
                .length,
              pending: __networkProbe.pending,
              maxPending: __networkProbe.maxPending,
              width: r.width,
              height: r.height,
              bitmap: canvas.width * canvas.height,
              nodes: Number(host.dataset.networkNodes),
              overflow: document.documentElement.scrollWidth > innerWidth,
              pointer: getComputedStyle(host).pointerEvents,
            };
          });
          check(
            metrics.count === 1 && metrics.maxPending <= 1,
            `${width}/${theme}${path}: one canvas and clock`,
          );
          check(
            !metrics.overflow &&
              metrics.width === width &&
              metrics.height === height,
            `${width}/${theme}${path}: viewport fit`,
          );
          check(
            metrics.bitmap <= 2810000 && metrics.pointer === "none",
            `${width}/${theme}${path}: capped bitmap and nonblocking layer`,
          );
          if (width < 640)
            check(metrics.nodes <= 32, `${theme}${path}: mobile node budget`);
          summary.routes.push({ width, theme, path, ...metrics });
        }
        await page.context().close();
      }
    progress("Checking real animation, controls and lifecycle");
    const page = await make();
    await open(page, "/");
    await page.locator('.product-scene canvas[data-motion="idle"]').waitFor();
    await page.waitForTimeout(800);
    const model = await page.locator(".product-scene canvas").elementHandle();
    const background = await page
      .locator(".public-atmosphere canvas")
      .elementHandle();
    const start = await page.evaluate(() => __networkProbe.frames.length);
    await page.waitForTimeout(4500);
    const metrics = await page.evaluate((start) => {
      const f = __networkProbe.frames.slice(start),
        durations = __networkProbe.costs.slice(-f.length).sort((a, b) => a - b);
      const first = f[0],
        last = f.at(-1);
      return {
        frames: f.length,
        fps: ((f.length - 1) * 1000) / (last.at - first.at),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95: durations[Math.floor(durations.length * 0.95)],
        connections: [...new Set(f.map((v) => v.connections))],
        glyphMoved: f.some((v) =>
          v.glyphs.some((g) =>
            first.glyphs.some(
              (b) => b[0] === g[0] && Math.hypot(g[1] - b[1], g[2] - b[2]) > 4,
            ),
          ),
        ),
        pulseMoved: f.some((v) =>
          v.pulses.some((n, i) => Math.abs(n - (first.pulses[i] ?? n)) > 8),
        ),
        maxPending: __networkProbe.maxPending,
      };
    }, start);
    check(metrics.glyphMoved, "Programming characters visibly change position");
    check(metrics.pulseMoved, "Data packets travel along connections");
    check(
      metrics.connections.length > 1,
      "Connections establish and dissolve during observation",
    );
    check(
      metrics.maxPending === 1,
      "No concurrent background animation callbacks",
    );
    summary.performance = metrics;
    await page.screenshot({ path: dir + "/after-light.png", scale: "css" });
    await page.locator(".preference-control--theme").click();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(350);
    check(
      await model.evaluate(
        (e) => e === document.querySelector(".product-scene canvas"),
      ),
      "Theme switch preserves model canvas",
    );
    await page.screenshot({ path: dir + "/after-dark.png", scale: "css" });
    await page.locator(".preference-control--theme").click();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.locator('.main-navigation a[href="/work"]').click();
    await page.locator(".portfolio-filters").waitFor();
    check(
      await background.evaluate(
        (e) => e === document.querySelector(".public-atmosphere canvas"),
      ),
      "SPA navigation retains the single background",
    );
    await page.locator(".portfolio-filters button").nth(1).click();
    check(
      (await page.locator(".portfolio-filters button.is-active").count()) === 1,
      "Portfolio filters remain usable",
    );
    await page.locator('.main-navigation a[href="/contact"]').click();
    await page.locator('input[name="fullName"]').fill("Network QA");
    check(
      (await page.locator('input[name="fullName"]').inputValue()) ===
        "Network QA",
      "Form typing is unobstructed",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .locator('.public-atmosphere[data-network-state="static"]')
      .waitFor();
    await page.waitForTimeout(500);
    const frozen = await page.evaluate(() => ({
      count: __networkProbe.frames.length,
      image: document.querySelector(".public-atmosphere canvas").toDataURL(),
    }));
    await page.waitForTimeout(400);
    check(
      await page.evaluate(
        (f) =>
          f.count === __networkProbe.frames.length &&
          f.image ===
            document.querySelector(".public-atmosphere canvas").toDataURL() &&
          __networkProbe.pending === 0,
        frozen,
      ),
      "Reduced motion renders a coherent static frame with no scheduled loop",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page
      .locator('.public-atmosphere[data-network-state="running"]')
      .waitFor();
    await page.emulateMedia({ forcedColors: "active" });
    check(
      await page
        .locator(".public-atmosphere")
        .evaluate(
          (e) =>
            getComputedStyle(e).display === "none" &&
            !e.hasAttribute("data-ready"),
        ),
      "Forced colours restore CSS backgrounds",
    );
    await page.emulateMedia({ forcedColors: "none", media: "print" });
    check(
      await page
        .locator(".public-atmosphere")
        .evaluate(
          (e) =>
            getComputedStyle(e).display === "none" &&
            !e.hasAttribute("data-ready"),
        ),
      "Print restores CSS backgrounds",
    );
    await page.emulateMedia({ media: "screen" });
    await page.context().close();

    const mobile = await make(390, 844, "dark", "ar", {
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await open(mobile, "/contact");
    await mobile.waitForTimeout(800);
    await mobile.screenshot({
      path: dir + "/after-mobile-dark.png",
      scale: "css",
    });
    await mobile.locator(".mobile-menu-trigger").click();
    await mobile.getByRole("dialog").waitFor();
    await mobile.keyboard.press("Escape");
    await mobile.getByRole("dialog").waitFor({ state: "hidden" });
    check(
      (await mobile.getByRole("dialog").count()) === 0,
      "Mobile menu opens and closes above the network",
    );
    await mobile.context().close();

    const lifecycle = await make();
    await lifecycle.goto(origin + "/tests/network.harness.html");
    await lifecycle.locator(".public-atmosphere[data-ready]").waitFor();
    for (let i = 0; i < 8; i++) {
      const old = await lifecycle
        .locator(".public-atmosphere canvas")
        .elementHandle();
      await lifecycle.locator("#dispose").click();
      check(
        await lifecycle.evaluate(
          () =>
            __networkProbe.pending === 0 &&
            document.querySelectorAll("[data-network-surface]").length === 0,
        ),
        `Unmount ${i + 1}: clock and surface markers released`,
      );
      check(
        await old.evaluate((e) => e.width === 0 && e.height === 0),
        `Unmount ${i + 1}: canvas memory released`,
      );
      await lifecycle.locator("#mount").click();
      await lifecycle.locator(".public-atmosphere[data-ready]").waitFor();
    }
    await lifecycle.evaluate(() => {
      const section = document.querySelector("main section");
      const wrapper = document.createElement("div");
      wrapper.className = "cms-slot cms-slot--ivory";
      section.before(wrapper);
      wrapper.append(section);
    });
    await lifecycle.waitForFunction(
      () =>
        document.querySelector("main section").dataset.networkSurface ===
        "paper",
    );
    await lifecycle.evaluate(
      () =>
        (document.querySelector(".cms-slot").className =
          "cms-slot cms-slot--mist"),
    );
    await lifecycle.waitForFunction(
      () =>
        document.querySelector("main section").dataset.networkSurface ===
        "mist",
    );
    check(
      await lifecycle.evaluate(() => {
        const canvas = document.querySelector(".public-atmosphere canvas");
        const heading = document.querySelector("h1").getBoundingClientRect();
        const dpr = canvas.width / innerWidth;
        const pixel = canvas
          .getContext("2d")
          .getImageData(
            (heading.left + 10) * dpr,
            (heading.top + heading.height / 2) * dpr,
            1,
            1,
          ).data;
        return pixel[0] === 233 && pixel[1] === 239 && pixel[2] === 236;
      }),
      "CMS surface class changes repaint the actual canvas without a route change",
    );
    await lifecycle.locator("#dispose").click();
    const stopped = await lifecycle.evaluate(
      () => __networkProbe.frames.length,
    );
    await lifecycle.evaluate(
      () => (document.querySelector("h1").textContent = "After disposal"),
    );
    await lifecycle.waitForTimeout(200);
    check(
      await lifecycle.evaluate(
        (n) => __networkProbe.frames.length === n,
        stopped,
      ),
      "Disposed observers do not resurrect the animation",
    );
    await lifecycle.context().close();

    const unavailable = await make();
    await unavailable.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...args) {
        return this.classList.contains("public-atmosphere__network")
          ? null
          : original.apply(this, args);
      };
    });
    await unavailable.goto(origin + "/services");
    await unavailable.locator('html[data-app-route-ready="true"]').waitFor();
    check(
      await unavailable
        .locator(".page-hero")
        .evaluate(
          (e) =>
            getComputedStyle(e).backgroundColor ===
            getComputedStyle(document.body).backgroundColor,
        ),
      "Unavailable Canvas keeps the original section surface",
    );
    check(
      await unavailable
        .locator(".site-footer")
        .evaluate(
          (e) => getComputedStyle(e).backgroundColor === "rgb(20, 43, 58)",
        ),
      "Unavailable Canvas keeps dark sections intact",
    );
    await unavailable.context().close();
    check(errors.length === 0, "No browser console or runtime errors");
    return { checks, summary };
  } finally {
    await writeFile(
      dir + "/verification.json",
      JSON.stringify({ checks, summary, errors }, null, 2),
    );
    for (const context of contexts) await context.close();
  }
}
