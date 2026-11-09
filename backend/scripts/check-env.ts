import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { cloudinaryConfig } from "../src/cloudinary";
const conflicts = readdirSync(".").filter((name) =>
  name.startsWith(".dev.vars"),
);
if (conflicts.length) {
  console.error(
    "Use backend/.env only. Move existing .dev.vars settings into it and remove the conflicting file before starting.",
  );
  process.exitCode = 1;
} else if (!existsSync(".env")) {
  console.error(
    "Create backend/.env from backend/.env.example and enter your Cloudinary credentials.",
  );
  process.exitCode = 1;
} else if (process.argv.includes("--required")) {
  try {
    cloudinaryConfig(parseEnv(readFileSync(".env", "utf8")));
  } catch {
    console.error(
      "Cloudinary credentials are missing or still placeholders in backend/.env. Nothing was uploaded or deployed.",
    );
    process.exitCode = 1;
  }
}
