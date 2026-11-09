import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { cloudinaryConfig } from "../backend/src/cloudinary";
import { discoverLegacyMedia } from "../backend/scripts/legacy-media";

describe("Cloudinary configuration and non-destructive migration", () => {
  it("rejects absent, partial and placeholder credentials without disclosing them", () => {
    for (const env of [
      {},
      { CLOUDINARY_CLOUD_NAME: "test" },
      {
        CLOUDINARY_CLOUD_NAME: "test",
        CLOUDINARY_API_KEY: "123",
        CLOUDINARY_API_SECRET: "your_api_secret",
      },
    ]) {
      expect(() => cloudinaryConfig(env)).toThrow("cloudinary_not_configured");
    }
  });
  it("adds provider metadata while preserving historical media and audit history", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(readFileSync("backend/migrations/0001_platform.sql", "utf8"));
      db.prepare("INSERT INTO media VALUES(?,?,?,?,?,?,?,?,?)").run(
        "old-id",
        "private/old/image.webp",
        "image.webp",
        "image/webp",
        42,
        "قديم",
        "Original",
        "private",
        "2020-01-01",
      );
      db.prepare(
        "INSERT INTO audit_logs VALUES('old-audit',NULL,'media.upload','old-id','','2020-01-01')",
      ).run();
      const before = db.prepare("SELECT * FROM media").get()!;
      db.exec(readFileSync("backend/migrations/0002_cloudinary.sql", "utf8"));
      const after = db.prepare("SELECT * FROM media").get()!;
      for (const key of Object.keys(before))
        expect(after[key]).toEqual(before[key]);
      expect(after.cloudinary_public_id).toBeNull();
      expect(after.revision).toBe(1);
      expect(db.prepare("SELECT id FROM audit_logs").get()?.id).toBe(
        "old-audit",
      );
    } finally {
      db.close();
    }
  });
  it("finds preserved local bytes without activating any storage service and fails closed if bytes disappear", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "mashrouak-media-audit-"));
    try {
      const state = resolve(directory, ".wrangler/state/v3");
      mkdirSync(resolve(state, "d1/local"), { recursive: true });
      mkdirSync(resolve(state, "r2/local"), { recursive: true });
      mkdirSync(resolve(state, "r2/old-bucket/blobs"), { recursive: true });
      const db = new DatabaseSync(resolve(state, "d1/local/db.sqlite"));
      db.exec(readFileSync("backend/migrations/0001_platform.sql", "utf8"));
      db.prepare(
        "INSERT INTO media VALUES('old-id','private/key','old.png','image/png',12,'قديم','Old','private','2020-01-01')",
      ).run();
      db.close();
      const objects = new DatabaseSync(
        resolve(state, "r2/local/objects.sqlite"),
      );
      objects.exec("CREATE TABLE _mf_objects(key TEXT,blob_id TEXT)");
      objects
        .prepare("INSERT INTO _mf_objects VALUES('private/key','abcdef')")
        .run();
      objects.close();
      const blob = resolve(state, "r2/old-bucket/blobs/abcdef");
      writeFileSync(blob, new Uint8Array(12));
      const result = discoverLegacyMedia(directory);
      expect(result.records).toHaveLength(1);
      expect(result.records[0]?.row.id).toBe("old-id");
      expect(result.records[0]?.sha256).toHaveLength(64);
      rmSync(blob);
      expect(() => discoverLegacyMedia(directory)).toThrow(
        "Historical bytes missing or ambiguous",
      );
      const check = new DatabaseSync(result.database!, { readOnly: true });
      expect(check.prepare("SELECT count(*) AS n FROM media").get()?.n).toBe(1);
      check.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
