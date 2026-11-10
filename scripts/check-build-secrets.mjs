import { readFile, readdir } from "node:fs/promises";
import { parseEnv } from "node:util";
const configured = parseEnv(await readFile("backend/.env", "utf8"));
const names = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "PAGES_PROXY_SECRET",
  "AI_API_KEY",
  "PROVISION_PASSWORD",
];
const secrets = names.flatMap((name) => {
  const value = process.env[name] || configured[name];
  if (!value || value.length < 12) return [];
  const values = [value];
  if (name.endsWith("DATABASE_URL")) {
    const password = decodeURIComponent(new URL(value).password);
    if (password.length >= 12) values.push(password);
  }
  return values;
});
if (!secrets.length) throw new Error("No protected values available to scan");
let files = 0,
  matches = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + "/" + entry.name;
    if (entry.isDirectory()) await scan(path);
    else if (/\.(?:html|js|css|map|json|txt)$/.test(entry.name)) {
      files++;
      const content = await readFile(path, "utf8");
      if (secrets.some((value) => content.includes(value))) matches++;
    }
  }
}
for (const directory of ["dist", "admin-dashboard/dist", "backend/dist"])
  await scan(directory);
console.log(
  JSON.stringify({ filesScanned: files, configuredSecretMatches: matches }),
);
if (matches) process.exitCode = 1;
