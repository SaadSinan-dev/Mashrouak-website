import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { seedEntries } from "../backend/src/seed-content.ts";
import { sceneChecks } from "./scene.browser.qa.mjs";

const server = await createServer({
  configFile: "vite.config.ts",
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  ...(existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
    ? {
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
      }
    : {}),
});
try {
  const content = {
    entries: seedEntries.map((entry, index) => ({
      ...entry,
      id: `scene-qa-${index}`,
      sort_order: entry.order,
    })),
    revision: 1,
    updatedAt: new Date().toISOString(),
    aiConfigured: false,
  };
  const checks = await sceneChecks(
    browser,
    `http://localhost:${server.httpServer.address().port}`,
    content,
  );
  console.log(`PASS: ${checks.length} public 3D audit checks`);
} finally {
  await browser.close();
  await server.close();
}
