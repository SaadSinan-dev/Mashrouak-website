import { DatabaseSync } from "node:sqlite";
import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { MediaRow } from "../src/media";

export function discoverLegacyMedia(backend: string, includeMigrated = false) {
  const state = resolve(backend, ".wrangler/state/v3").replaceAll("\\", "/");
  const databases: { file: string; upgraded: boolean }[] = [];
  for (const file of globSync(`${state}/d1/**/*.sqlite`)) {
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      if (
        db.prepare("SELECT name FROM sqlite_master WHERE name='media'").get()
      ) {
        const columns = db.prepare("PRAGMA table_info(media)").all() as {
          name: string;
        }[];
        databases.push({
          file,
          upgraded: columns.some(
            (column) => column.name === "cloudinary_public_id",
          ),
        });
      }
    } finally {
      db.close();
    }
  }
  // An old local identifier may leave a retained pre-migration store behind.
  // Prefer the one explicitly upgraded by Wrangler; never write to the backup.
  const upgraded = databases.filter((database) => database.upgraded);
  const selected = upgraded.length ? upgraded : databases;
  if (selected.length > 1)
    throw new Error(
      "Multiple local media databases found. Select the intended state directory before migration.",
    );
  if (!selected.length) return { database: null, records: [] };
  const database = selected[0]!.file;
  const db = new DatabaseSync(database, { readOnly: true });
  const rows = db.prepare("SELECT * FROM media").all() as unknown as MediaRow[];
  db.close();
  const records = rows
    .filter((row) => includeMigrated || !row.cloudinary_public_id)
    .map((row) => {
      const matches: string[] = [];
      for (const file of globSync(`${state}/r2/**/*.sqlite`)) {
        const objects = new DatabaseSync(file, { readOnly: true });
        try {
          if (
            !objects
              .prepare(
                "SELECT name FROM sqlite_master WHERE name='_mf_objects'",
              )
              .get()
          )
            continue;
          const object = objects
            .prepare("SELECT blob_id FROM _mf_objects WHERE key=?")
            .get(row.object_key) as { blob_id: string } | undefined;
          if (object && /^[a-f0-9]+$/.test(object.blob_id))
            matches.push(...globSync(`${state}/r2/*/blobs/${object.blob_id}`));
        } finally {
          objects.close();
        }
      }
      if (matches.length !== 1)
        throw new Error(
          `Historical bytes missing or ambiguous for media ${row.id}; no records changed.`,
        );
      const bytes = readFileSync(matches[0]!);
      if (bytes.length !== row.size)
        throw new Error(
          `Historical size mismatch for media ${row.id}; no records changed.`,
        );
      return {
        row,
        bytes,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    });
  return { database, records };
}
