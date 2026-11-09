import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

export async function mediaBrowserChecks(
  page,
  {
    adminOrigin = "http://localhost:5174",
    backendOrigin = "http://127.0.0.1:8789",
  } = {},
) {
  const evidence = "artifacts/cloudinary-qa";
  await mkdir(evidence, { recursive: true });
  const checks = [];
  const check = (condition, label) => {
    assert.ok(condition, label);
    checks.push(label);
  };
  await page.goto(adminOrigin + "/media");
  await page.locator(".media-upload-form").waitFor();
  if (
    await page.getByRole("button", { name: "التبديل إلى الإنجليزية" }).count()
  )
    await page.getByRole("button", { name: "التبديل إلى الإنجليزية" }).click();
  await page.locator(".sk-grid--media").waitFor({ state: "detached" });
  while (await page.locator(".media-card").count()) {
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .locator(".media-card")
      .first()
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page.locator(".sk-grid--media").waitFor({ state: "detached" });
    await page.waitForFunction(
      () => !document.querySelector(".media-upload-form[aria-busy=true]"),
    );
  }
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const skeletonHandler = async (route) => {
    if (route.request().method() === "GET") await gate;
    await route.fallback();
  };
  await page.route("**/api/media", skeletonHandler);
  await page.reload();
  await page.locator(".sk-grid--media").waitFor();
  check(
    (await page.locator("[aria-busy=true]").count()) > 0,
    "Library skeleton is accessible",
  );
  await page.screenshot({ path: `${evidence}/skeleton.png`, scale: "css" });
  release();
  await page.unroute("**/api/media", skeletonHandler);
  await page.locator(".sk-grid--media").waitFor({ state: "detached" });
  check(
    await page.locator(".admin-empty").isVisible(),
    "Empty library has a distinct state",
  );
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 140;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#124f56";
      ctx.fillRect(0, 0, 200, 140);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "media-qa.png",
      mimeType: "image/png",
      buffer: png,
    });
  await page.getByLabel("Arabic alternative text").fill("صورة اختبار");
  await page.getByLabel("English alternative text").fill("Test image");
  const failUpload = async (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: "cloudinary_unavailable" }),
        })
      : route.fallback();
  await page.route("**/api/media", failUpload);
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await page.getByRole("alert").waitFor();
  check(
    (await page.getByLabel("English alternative text").inputValue()) ===
      "Test image",
    "Failed upload preserves fields",
  );
  check(
    await page
      .locator("input[type=file]")
      .evaluate((el) => el.files.length === 1),
    "Failed upload preserves selected file",
  );
  await page.screenshot({ path: `${evidence}/upload-error.png`, scale: "css" });
  await page.unroute("**/api/media", failUpload);
  let finishUpload;
  const uploadGate = new Promise((resolve) => {
    finishUpload = resolve;
  });
  const progressHandler = async (route) => {
    if (route.request().method() === "POST") await uploadGate;
    await route.fallback();
  };
  await page.route("**/api/media", progressHandler);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.locator(".media-progress").waitFor();
  check(
    await page.locator("progress").isVisible(),
    "Upload displays progress and processing feedback",
  );
  await page.screenshot({
    path: `${evidence}/upload-progress.png`,
    scale: "css",
  });
  finishUpload();
  await page.unroute("**/api/media", progressHandler);
  await page.locator(".media-card").waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector(".media-card img");
    return image?.complete && image.naturalWidth > 0;
  });
  check(true, "Retried upload creates a decoded image preview");
  let canonical = await page.locator(".media-card img").getAttribute("src");
  canonical = canonical.split("?")[0];
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Copy URL" })
    .click();
  await page
    .locator(".admin-notice")
    .filter({ hasText: "URL copied" })
    .waitFor();
  check(
    (await page.locator(".admin-notice").first().innerText()).includes(
      "copied",
    ),
    "Copy URL confirms completion",
  );
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const edit = page.locator(".media-upload-form").nth(1);
  await edit.getByLabel("Arabic alternative text").fill("وصف معدّل");
  await edit.getByLabel("English alternative text").fill("Edited description");
  await edit.getByLabel("Visibility").selectOption("private");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await edit.waitFor({ state: "detached" });
  check(
    (await page.locator(".media-card").innerText()).includes(
      "Edited description",
    ),
    "Both-language metadata is saved",
  );
  check(
    (await page.locator(".media-card").innerText()).includes("Private"),
    "Visibility change is reflected in the card",
  );
  const anonymous = await page.context().browser().newContext();
  const denied = await anonymous.request.get(backendOrigin + canonical);
  check(
    denied.status() === 404,
    "Signed-out browser cannot retrieve private media",
  );
  await anonymous.close();
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .locator(".media-upload-form")
    .nth(1)
    .getByLabel("Visibility")
    .selectOption("public");
  await page
    .locator(".media-upload-form")
    .nth(1)
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page
    .locator(".media-upload-form")
    .nth(1)
    .waitFor({ state: "detached" });
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Replace image", exact: true })
    .click();
  check(
    await page.getByLabel("Visibility").isDisabled(),
    "Replacement retains visibility",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check(
    await page.getByLabel("Visibility").isEnabled(),
    "Replacement can be cancelled",
  );
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Replace image", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: png,
    });
  await page
    .locator(".media-upload-form")
    .getByRole("button", { name: "Replace image", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".media-card h2")?.textContent ===
      "replacement.webp",
  );
  check(
    (await page.locator(".media-card img").getAttribute("src")).split(
      "?",
    )[0] === canonical,
    "Replacement keeps the canonical URL",
  );
  const content = await page.evaluate(async (url) => {
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mashrouak-Request": "1",
      },
      body: JSON.stringify({
        kind: "pages",
        slug: "media-browser-usage",
        sort_order: 0,
        version: 0,
        data: {
          title: { ar: "اختبار", en: "Test" },
          description: { ar: url, en: url },
          seoTitle: { ar: "", en: "" },
          seoDescription: { ar: "", en: "" },
          sections: [],
        },
      }),
    });
    return response.json();
  }, canonical);
  assert.ok(
    content.entry,
    "Usage fixture was created in the isolated database",
  );
  await page.reload();
  await page.locator(".media-card").waitFor();
  check(
    await page.locator(".media-usage").isVisible(),
    "Usage is displayed from real D1 content references",
  );
  check(
    await page
      .locator(".media-card")
      .getByRole("button", { name: "Delete", exact: true })
      .isDisabled(),
    "Deletion is disabled for media in use",
  );
  const failImage = (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: '{"error":"cloudinary_unavailable"}',
    });
  await page.route("**/api/media/*?v=*", failImage);
  await page.reload();
  await page.locator(".media-preview-error").waitFor();
  await page.screenshot({
    path: `${evidence}/preview-error.png`,
    scale: "css",
  });
  await page.unroute("**/api/media/*?v=*", failImage);
  await page
    .locator(".media-preview-error")
    .getByRole("button", { name: "Retry" })
    .click();
  await page.waitForFunction(() => {
    const image = document.querySelector(".media-card img");
    return image?.complete && image.naturalWidth > 0;
  });
  check(true, "Failed preview retries successfully");
  for (const language of ["en", "ar"]) {
    if (language === "ar")
      await page.getByRole("button", { name: "Switch to Arabic" }).click();
    for (const theme of ["light", "dark"]) {
      const desired =
        language === "ar"
          ? theme === "dark"
            ? "المظهر الداكن"
            : "المظهر الفاتح"
          : theme === "dark"
            ? "Dark theme"
            : "Light theme";
      if (
        await page.getByRole("button", { name: desired, exact: true }).count()
      )
        await page.getByRole("button", { name: desired, exact: true }).click();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter((a) => a.effect?.getTiming().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          ),
        );
        await page.evaluate(() => scrollTo(0, 0));
        check(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${language}/${theme}/${width}: no horizontal overflow`,
        );
        await page.screenshot({
          path: `${evidence}/${language}-${theme}-${width}.png`,
          scale: "css",
        });
        await page
          .locator(".media-card")
          .screenshot({
            path: `${evidence}/${language}-${theme}-${width}-card.png`,
            scale: "css",
          });
      }
    }
  }
  await page.getByRole("button", { name: "التبديل إلى الإنجليزية" }).click();
  await page.evaluate(async (entry) => {
    const response = await fetch(
      `/api/admin/content/${entry.id}?version=${entry.version}`,
      { method: "DELETE", headers: { "X-Mashrouak-Request": "1" } },
    );
    if (!response.ok) throw new Error("Usage cleanup failed");
  }, content.entry);
  await page.reload();
  await page.locator(".media-card").waitFor();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  check(
    (await page.locator(".media-card").count()) === 1,
    "Deletion can be cancelled",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".media-card")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.locator(".admin-empty").waitFor();
  check(true, "Confirmed safe deletion restores the empty state");
  return checks;
}
