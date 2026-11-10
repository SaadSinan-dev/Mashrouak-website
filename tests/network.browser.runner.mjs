import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { seedEntries } from "../backend/src/seed-content.ts";
import { networkChecks } from "./network.browser.qa.mjs";

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
      id: `network-qa-${index}`,
      sort_order: entry.order,
    })),
    revision: 1,
    updatedAt: new Date().toISOString(),
    aiConfigured: false,
  };
  const result = await networkChecks(
    browser,
    `http://localhost:${server.httpServer.address().port}`,
    content,
    console.log,
  );
  console.log(
    `PASS: ${result.checks.length} public network checks`,
    result.summary.performance,
  );
} finally {
  await browser.close();
  await server.close();
}
