import { spawn } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(".");
const definitions = [
  [
    "Website",
    "node_modules/vite/bin/vite.js",
    ["--host", "0.0.0.0", "--port", "5173", "--strictPort"],
    root,
  ],
  [
    "Dashboard",
    "node_modules/vite/bin/vite.js",
    ["--host", "127.0.0.1", "--port", "5174", "--strictPort"],
    resolve("admin-dashboard"),
  ],
  [
    "API",
    "node_modules/tsx/dist/cli.mjs",
    ["watch", "src/server.ts"],
    resolve("backend"),
  ],
];
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const [name, entry, args, cwd] of definitions) {
  const child = spawn(process.execPath, [resolve(root, entry), ...args], {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(`${name}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
