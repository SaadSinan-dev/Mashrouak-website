import {existsSync} from "node:fs";
import {createPostgresPool} from "../src/database";
if(process.env.NODE_ENV!=="production"&&existsSync(".env"))process.loadEnvFile(".env");
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required");
if(!["localhost","127.0.0.1","[::1]"].includes(new URL(process.env.DATABASE_URL).hostname)&&!process.argv.includes("--allow-remote"))throw new Error("Explicit --allow-remote required for intended remote account creation");
import { createInterface } from "node:readline/promises";
import { z } from "zod";
import { passwordHash } from "../src/security";

const prompts = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const email = z
  .email()
  .parse(
    (
      process.env.PROVISION_EMAIL ??
      (await prompts.question("Administrator email: "))
    ).toLowerCase(),
  );
const name = z
  .string()
  .min(2)
  .max(100)
  .parse(
    process.env.PROVISION_NAME ??
      (await prompts.question("Administrator display name: ")),
  );
prompts.close();
async function hiddenPassword() {
  if (!process.stdin.isTTY)
    throw new Error("Set PROVISION_PASSWORD for non-interactive provisioning");
  process.stdout.write("Password (14+ characters; hidden): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const listener = (buffer: Buffer) => {
      const chars = buffer.toString();
      if (chars === "\u0003") {
        cleanup();
        reject(new Error("Cancelled"));
        return;
      }
      if (chars.includes("\r") || chars.includes("\n")) {
        cleanup();
        resolve(value);
        return;
      }
      if (chars === "\u007f" || chars === "\b") value = value.slice(0, -1);
      else value += chars;
    };
    const cleanup = () => {
      process.stdin.off("data", listener);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    process.stdin.on("data", listener);
  });
}
const password = z
  .string()
  .min(14)
  .max(256)
  .parse(process.env.PROVISION_PASSWORD ?? (await hiddenPassword()));
const role = z
  .enum(["owner", "editor", "support"])
  .parse(process.env.PROVISION_ROLE ?? "owner");
const pool=createPostgresPool(process.env.DATABASE_URL!);
try{await pool.query('INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),email,name,await passwordHash(password),role]);console.log('Administrator created. Existing accounts remain unchanged.');}
catch(error){console.error((error as {code?:string}).code==='23505'?'This administrator already exists; no password was changed.':'Administrator creation failed. Existing accounts remain unchanged.');process.exitCode=1;}
finally{delete process.env.PROVISION_PASSWORD;await pool.end();}
