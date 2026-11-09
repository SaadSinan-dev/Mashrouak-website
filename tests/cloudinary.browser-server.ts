import { mkdir, writeFile, unlink } from "node:fs/promises";
import { createMediaBrowserFixture } from "./cloudinary.browser-fixture";
const fixture = await createMediaBrowserFixture("http://localhost:5174", 8789);
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/cloudinary-browser-session.json",
  JSON.stringify({ token: fixture.token }),
  { mode: 0o600 },
);
console.log(
  "ISOLATED_MEDIA_QA_READY (disposable session stored in ignored artifacts)",
);
process.on("SIGINT", async () => {
  await fixture.platform.dispose();
  await unlink("artifacts/cloudinary-browser-session.json").catch(() => {});
  process.exit(0);
});
