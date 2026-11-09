import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppEnv, Ctx, Env } from "./types";
import { id, now } from "./types";
import { authorize, currentUser, rateLimit } from "./security";
import {
  cloudinaryConfig,
  cloudinaryDelivery,
  destroyCloudinary,
  uploadCloudinary,
} from "./cloudinary";

export interface MediaRow {
  id: string;
  object_key: string;
  filename: string;
  type: string;
  size: number;
  alt_ar: string;
  alt_en: string;
  visibility: "public" | "private";
  created_at: string;
  cloudinary_asset_id: string | null;
  cloudinary_public_id: string | null;
  cloudinary_resource_type: "image" | null;
  cloudinary_delivery_type: "authenticated" | null;
  cloudinary_version: number | null;
  cloudinary_format: string | null;
  cloudinary_secure_url: string | null;
  width: number | null;
  height: number | null;
  revision: number;
  updated_at: string | null;
}
const fieldsSchema = z.object({
  alt_ar: z.string().trim().min(1).max(500),
  alt_en: z.string().trim().min(1).max(500),
  visibility: z.enum(["public", "private"]),
});
// Include revisions so restoring a draft never restores a deleted image reference.
const usageCondition =
  "EXISTS (SELECT 1 FROM content WHERE strpos(draft,?)>0 OR strpos(coalesce(published,''),?)>0) OR EXISTS (SELECT 1 FROM revisions WHERE strpos(data,?)>0)";
const reference = (mediaId: string) => `/api/media/${mediaId}`;
async function requiredRow(c: Ctx) {
  const row = await c.env.DB.prepare("SELECT * FROM media WHERE id=?")
    .bind(c.req.param("id"))
    .first<MediaRow>();
  if (!row) throw new HTTPException(404, { message: "not_found" });
  return row;
}
export async function validateImage(file: unknown) {
  if (!(file instanceof File) || file.size < 12 || file.size > 5 * 1024 * 1024)
    throw new HTTPException(422, { message: "image_size" });
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const signature = new TextDecoder().decode(bytes);
  const detected = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (v, i) => bytes[i] === v,
  )
    ? ["image/png", "png"]
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? ["image/jpeg", "jpg"]
      : signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP"
        ? ["image/webp", "webp"]
        : signature.slice(4, 8) === "ftyp" &&
            ["avif", "avis"].includes(signature.slice(8, 12))
          ? ["image/avif", "avif"]
          : null;
  if (!detected || file.type !== detected[0])
    throw new HTTPException(422, { message: "image_type" });
  const filename = `${
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 80) || "image"
  }.${detected[1]}`;
  return { file, filename, type: detected[0]! };
}
export async function queueMediaCleanup(env: Env, publicId: string, delay = 0) {
  await env.DB.prepare(
    "INSERT INTO media_cleanup(public_id,not_before) VALUES(?,?) ON CONFLICT(public_id) DO NOTHING",
  )
    .bind(publicId, Date.now() + delay)
    .run();
}
export async function cleanupMediaAsset(
  env: Env,
  publicId: string,
): Promise<boolean> {
  // Delayed or duplicate cleanup must never remove a currently referenced asset.
  if (
    await env.DB.prepare("SELECT id FROM media WHERE cloudinary_public_id=?")
      .bind(publicId)
      .first()
  ) {
    await env.DB.prepare(
      "DELETE FROM media_cleanup WHERE public_id=? AND EXISTS(SELECT 1 FROM media WHERE cloudinary_public_id=?)",
    )
      .bind(publicId, publicId)
      .run();
    return true;
  }
  try {
    await destroyCloudinary(env, publicId);
    await env.DB.prepare("DELETE FROM media_cleanup WHERE public_id=?")
      .bind(publicId)
      .run();
    return true;
  } catch {
    await env.DB.prepare(
      "UPDATE media_cleanup SET attempts=attempts+1,not_before=? WHERE public_id=?",
    )
      .bind(Date.now() + 3600000, publicId)
      .run();
    return false;
  }
}
export async function retryMediaCleanup(env: Env) {
  const pending = await env.DB.prepare(
    "SELECT public_id FROM media_cleanup WHERE not_before<=? ORDER BY not_before LIMIT 20",
  )
    .bind(Date.now())
    .all<{ public_id: string }>();
  for (const row of pending.results)
    await cleanupMediaAsset(env, row.public_id);
}
function describe(row: MediaRow) {
  // Provider URLs and identifiers stay server-side.
  return {
    id: row.id,
    url: reference(row.id),
    filename: row.filename,
    type: row.type,
    size: row.size,
    alt_ar: row.alt_ar,
    alt_en: row.alt_en,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
    revision: row.revision,
    width: row.width,
    height: row.height,
    migration_required: !row.cloudinary_public_id,
  };
}
export const media = new Hono<AppEnv>();
media.get("/:id", async (c) => {
  const row = await requiredRow(c);
  if (row.visibility === "private") {
    const user = await currentUser(c);
    if (!user || !["owner", "editor"].includes(user.role))
      throw new HTTPException(404, { message: "not_found" });
  }
  if (
    !row.cloudinary_public_id ||
    !row.cloudinary_format ||
    !row.cloudinary_version ||
    row.cloudinary_delivery_type !== "authenticated"
  )
    throw new HTTPException(503, { message: "media_migration_required" });
  // Revalidate stable public IDs before reusing bytes; visibility changes still
  // perform authorization above and replacements have a new revision/ETag.
  const etag=`"media-${row.id}-${row.revision}"`;
  if(row.visibility==='public'){
    c.header('Cache-Control','private, no-cache, must-revalidate');
    c.header('CDN-Cache-Control','no-store');c.header('ETag',etag);c.header('Vary','Cookie, Origin');
    if(c.req.header('If-None-Match')===etag)return c.body(null,304);
  }
  const response = await cloudinaryDelivery(
    c.env,
    {
      cloudinary_public_id: row.cloudinary_public_id,
      cloudinary_format: row.cloudinary_format,
      cloudinary_version: row.cloudinary_version,
    },
    row.visibility === "public",
  );
  const type = response.headers.get("Content-Type")?.split(";")[0];
  if (
    !type ||
    !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(type)
  ) {
    await response.body?.cancel();
    throw new HTTPException(502, { message: "cloudinary_invalid_response" });
  }
  c.header("Content-Type", type);
  c.header("Content-Disposition", `inline; filename="${row.filename}"`);
  // Stable IDs change visibility/bytes: caches must not bypass authorization.
  c.header("Cache-Control", row.visibility==='public'?'private, no-cache, must-revalidate':'private, no-store');
  c.header("Cross-Origin-Resource-Policy", "same-site");
  c.header("Vary", "Cookie, Origin");
  if (row.visibility === "private")
    c.header("X-Robots-Tag", "noindex, noarchive");
  return new Response(response.body, { headers: c.res.headers });
});
media.get("/", authorize(["owner", "editor"]), async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM media ORDER BY created_at DESC LIMIT 500",
  ).all<MediaRow>();
  const content = await c.env.DB.prepare(
    "SELECT id,slug,draft,published FROM content",
  ).all<{
    id: string;
    slug: string;
    draft: string;
    published: string | null;
  }>();
  const revisions = await c.env.DB.prepare(
    "SELECT r.content_id AS id,c.slug,r.data FROM revisions r JOIN content c ON c.id=r.content_id",
  ).all<{ id: string; slug: string; data: string }>();
  const pending = await c.env.DB.prepare(
    "SELECT count(*) AS count FROM media_cleanup",
  ).first<{ count: number }>();
  return c.json({
    media: rows.results.map((row) => ({
      ...describe(row),
      usage: Array.from(
        new Map([
          ...content.results
            .filter((e) =>
              `${e.draft}${e.published ?? ""}`.includes(reference(row.id)),
            )
            .map((e) => [e.id, { id: e.id, slug: e.slug }] as const),
          ...revisions.results
            .filter((e) => e.data.includes(reference(row.id)))
            .map((e) => [e.id, { id: e.id, slug: e.slug }] as const),
        ]).values(),
      ),
    })),
    cleanup_pending: pending?.count ?? 0,
  });
});
async function storeImage(c: Ctx, previous?: MediaRow) {
  if (previous && !previous.cloudinary_public_id)
    throw new HTTPException(409, { message: "media_migration_required" });
  await rateLimit(c, "upload", 60, 3600, c.get("user").id);
  const form = await c.req.formData();
  const image = await validateImage(form.get("file"));
  const fields = fieldsSchema.parse({
    alt_ar: form.get("alt_ar"),
    alt_en: form.get("alt_en"),
    visibility: form.get("visibility"),
  });
  const expected = previous
    ? z.coerce.number().int().positive().parse(form.get("revision"))
    : 1;
  if (
    previous &&
    (expected !== previous.revision ||
      fields.visibility !== previous.visibility)
  )
    throw new HTTPException(409, { message: "version_conflict" });
  const config = cloudinaryConfig(c.env);
  const mediaId = previous?.id ?? id();
  const publicId = `${config.folder}/${mediaId}/${id()}`;
  // Journal BEFORE the network call, including uploads with uncertain outcomes.
  await queueMediaCleanup(c.env, publicId, 3600000);
  let uploaded = false;
  try {
    const asset = await uploadCloudinary(c.env, image.file, publicId);
    uploaded = true;
    const metadata = [
      asset.asset_id,
      asset.public_id,
      asset.resource_type,
      asset.type,
      asset.version,
      asset.format,
      asset.secure_url,
      asset.width,
      asset.height,
    ];
    const mutation = previous
      ? c.env.DB.prepare(
          "UPDATE media SET filename=?,type=?,size=?,alt_ar=?,alt_en=?,cloudinary_asset_id=?,cloudinary_public_id=?,cloudinary_resource_type=?,cloudinary_delivery_type=?,cloudinary_version=?,cloudinary_format=?,cloudinary_secure_url=?,width=?,height=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id",
        ).bind(
          image.filename,
          image.type,
          image.file.size,
          fields.alt_ar,
          fields.alt_en,
          ...metadata,
          now(),
          mediaId,
          expected,
        )
      : c.env.DB.prepare(
          "INSERT INTO media(id,object_key,filename,type,size,alt_ar,alt_en,visibility,created_at,cloudinary_asset_id,cloudinary_public_id,cloudinary_resource_type,cloudinary_delivery_type,cloudinary_version,cloudinary_format,cloudinary_secure_url,width,height,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
        ).bind(
          mediaId,
          `cloudinary/${mediaId}`,
          image.filename,
          image.type,
          image.file.size,
          fields.alt_ar,
          fields.alt_en,
          fields.visibility,
          now(),
          ...metadata,
          now(),
        );
    const statements = [
      mutation,
      c.env.DB.prepare(
        "DELETE FROM media_cleanup WHERE public_id=? AND EXISTS(SELECT 1 FROM media WHERE id=? AND cloudinary_public_id=?)",
      ).bind(publicId, mediaId, publicId),
      c.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM media WHERE id=? AND cloudinary_public_id=?)",
      ).bind(
        id(),
        c.get("user").id,
        previous ? "media.replace" : "media.upload",
        mediaId,
        "",
        now(),
        mediaId,
        publicId,
      ),
    ];
    if (previous?.cloudinary_public_id)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO media_cleanup(public_id,not_before) SELECT ?,? WHERE EXISTS(SELECT 1 FROM media WHERE id=? AND cloudinary_public_id=?) ON CONFLICT(public_id) DO NOTHING",
        ).bind(previous.cloudinary_public_id, Date.now(), mediaId, publicId),
      );
    const results = await c.env.DB.batch(statements);
    if (!results[0]?.results.length)
      throw new HTTPException(409, { message: "version_conflict" });
  } catch (error) {
    // A timed-out upload may still complete remotely. Its journal must survive
    // until a later cleanup, rather than trusting an immediate "not found".
    if (uploaded) await cleanupMediaAsset(c.env, publicId);
    throw error;
  }
  const cleanupPending = previous?.cloudinary_public_id
    ? !(await cleanupMediaAsset(c.env, previous.cloudinary_public_id))
    : false;
  return {
    id: mediaId,
    url: reference(mediaId),
    cleanup_pending: cleanupPending,
  };
}
media.post("/", authorize(["owner", "editor"]), async (c) =>
  c.json(await storeImage(c), 201),
);
media.post("/:id/replace", authorize(["owner", "editor"]), async (c) =>
  c.json(await storeImage(c, await requiredRow(c))),
);
media.put("/:id", authorize(["owner", "editor"]), async (c) => {
  const row = await requiredRow(c);
  const input = fieldsSchema
    .partial({ visibility: true })
    .extend({ revision: z.number().int().positive().optional() })
    .strict()
    .parse(await c.req.json());
  const visibility = input.visibility ?? row.visibility;
  const ref = reference(row.id);
  const result = await c.env.DB.prepare(
      "WITH changed AS (UPDATE media SET alt_ar=?,alt_en=?,visibility=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND (?='public' OR NOT EXISTS(SELECT 1 FROM content WHERE status='published' AND strpos(coalesce(published,''),?)>0)) RETURNING id), audited AS (INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) SELECT ?,?,'media.edit',id,'',? FROM changed) SELECT id FROM changed",
    ).bind(
      input.alt_ar,
      input.alt_en,
      visibility,
      now(),
      row.id,
      input.revision ?? row.revision,
      visibility,
      ref,
      id(), c.get("user").id, now(),
    ).all();
  if (!result.results.length) {
    if (
      visibility === "private" &&
      (await c.env.DB.prepare(
        "SELECT id FROM content WHERE status='published' AND strpos(coalesce(published,''),?)>0",
      )
        .bind(ref)
        .first())
    )
      throw new HTTPException(409, { message: "media_published" });
    throw new HTTPException(409, { message: "version_conflict" });
  }
  return c.json({ ok: true });
});
media.delete("/:id", authorize(["owner", "editor"]), async (c) => {
  const row = await requiredRow(c);
  if (!row.cloudinary_public_id)
    throw new HTTPException(409, { message: "media_migration_required" });
  const ref = reference(row.id);
  const noUsage = `NOT (${usageCondition})`;
  const removed = await c.env.DB.prepare(
      `WITH removed AS (DELETE FROM media WHERE id=? AND revision=? AND ${noUsage} RETURNING id,cloudinary_public_id), queued AS (INSERT INTO media_cleanup(public_id,not_before) SELECT cloudinary_public_id,? FROM removed ON CONFLICT(public_id) DO NOTHING), audited AS (INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) SELECT ?,?,'media.delete',id,'',? FROM removed) SELECT id FROM removed`,
    ).bind(row.id, row.revision, ref, ref, ref, Date.now(), id(), c.get("user").id, now()).all();
  if (!removed.results.length)
    throw new HTTPException(409, { message: "media_in_use" });
  return c.json({
    ok: true,
    cleanup_pending: !(await cleanupMediaAsset(
      c.env,
      row.cloudinary_public_id,
    )),
  });
});
