import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  contentSchemas,
  entryInput,
  kinds,
  validatePublication,
  type ContentData,
  type ContentEntry,
  type ContentKind,
  type PublicEntry,
} from "../../shared/schema";
import type { AppEnv, Ctx } from "./types";
import { id, now } from "./types";
import { auditStatement, authorize, hash } from "./security";

interface Row extends Omit<ContentEntry, "draft" | "published"> {
  draft: string;
  published: string | null;
}
export const decodeEntry = (row: Row): ContentEntry => ({
  ...row,
  draft: JSON.parse(row.draft),
  published: row.published ? JSON.parse(row.published) : null,
});
export async function publicEntries(c: Ctx): Promise<PublicEntry[]> {
  const rows = await c.env.DB.prepare(
    "SELECT id,kind,COALESCE(published_slug,slug) AS slug,COALESCE(published_sort_order,sort_order) AS sort_order,published FROM content WHERE published IS NOT NULL AND status='published' AND kind!='knowledge' ORDER BY sort_order,slug",
  ).all<{
    id: string;
    kind: ContentKind;
    slug: string;
    sort_order: number;
    published: string;
  }>();
  return rows.results.map(({ published, ...row }) => ({
    ...row,
    data: JSON.parse(published),
  }));
}
export const cms = new Hono<AppEnv>();
cms.use("*", authorize(["owner", "editor"]));
cms.get("/", async (c) => {
  const kind = z.enum(kinds).optional().parse(c.req.query("kind"));
  const rows = kind
    ? await c.env.DB.prepare(
        "SELECT * FROM content WHERE kind=? ORDER BY sort_order,slug",
      )
        .bind(kind)
        .all<Row>()
    : await c.env.DB.prepare(
        "SELECT * FROM content ORDER BY kind,sort_order,slug",
      ).all<Row>();
  return c.json({ entries: rows.results.map(decodeEntry) });
});
cms.post("/", async (c) => {
  const input = entryInput.parse(await c.req.json());
  const data = contentSchemas[input.kind].parse(input.data);
  if (input.kind === "settings" && input.slug !== "global")
    throw new HTTPException(400, { message: "settings_slug_must_be_global" });
  const entryId = id();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO content(id,kind,slug,sort_order,draft,updated_at) VALUES(?,?,?,?,?,?)",
    ).bind(
      entryId,
      input.kind,
      input.slug,
      input.sort_order,
      JSON.stringify(data),
      now(),
    ),
    auditStatement(c, "content.create", entryId, input.kind),
  ]);
  return c.json(
    {
      entry: decodeEntry(
        (await c.env.DB.prepare("SELECT * FROM content WHERE id=?")
          .bind(entryId)
          .first<Row>())!,
      ),
    },
    201,
  );
});
cms.put("/:id", async (c) => {
  const entryId = c.req.param("id");
  const input = entryInput.parse(await c.req.json());
  const previous = await c.env.DB.prepare("SELECT * FROM content WHERE id=?")
    .bind(entryId)
    .first<Row>();
  if (!previous) throw new HTTPException(404, { message: "not_found" });
  if (
    input.kind !== previous.kind ||
    (previous.kind === "settings" && input.slug !== "global")
  )
    throw new HTTPException(400, { message: "kind_cannot_change" });
  const data = contentSchemas[input.kind].parse(input.data);
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO revisions(id,content_id,version,data,actor_id,created_at) SELECT ?,id,version,draft,?,? FROM content WHERE id=? AND version=?",
    ).bind(id(), c.get("user").id, now(), entryId, input.version),
    c.env.DB.prepare(
      "UPDATE content SET slug=?,sort_order=?,draft=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *",
    ).bind(
      input.slug,
      input.sort_order,
      JSON.stringify(data),
      now(),
      entryId,
      input.version,
    ),
  ]);
  const row = result[1]?.results[0] as unknown as Row | undefined;
  if (!row) throw new HTTPException(409, { message: "version_conflict" });
  await auditStatement(c, "content.save", entryId).run();
  return c.json({ entry: decodeEntry(row) });
});
cms.post("/:id/publish", async (c) => {
  const { version } = z
    .object({ version: z.number().int() })
    .strict()
    .parse(await c.req.json());
  const row = await c.env.DB.prepare(
    "SELECT * FROM content WHERE id=? AND version=?",
  )
    .bind(c.req.param("id"), version)
    .first<Row>();
  if (!row) throw new HTTPException(409, { message: "version_conflict" });
  const data = contentSchemas[row.kind].parse(
    JSON.parse(row.draft),
  ) as ContentData;
  const problem = validatePublication(row.kind, data);
  if (problem)
    return c.json({ error: "publication_invalid", detail: problem }, 422);
  // A private evidence upload must never be linked as if visitors can read it.
  {
    const privateMedia = await c.env.DB.prepare(
      "SELECT id FROM media WHERE visibility='private'",
    ).all<{ id: string }>();
    if (
      privateMedia.results.some((m) => row.draft.includes(`/api/media/${m.id}`))
    )
      return c.json({ error: "private_evidence" }, 422);
  }
  const rowResult = await c.env.DB.prepare(
    "WITH changed AS (UPDATE content SET published=draft,published_slug=slug,published_sort_order=sort_order,status='published',version=version+1,updated_at=? WHERE id=? AND version=? AND NOT EXISTS(SELECT 1 FROM media WHERE visibility='private' AND strpos(content.draft,'/api/media/'||media.id)>0) RETURNING *), publication AS (UPDATE publication_state SET revision=revision+1,updated_at=? WHERE id=1 AND EXISTS(SELECT 1 FROM changed) RETURNING revision,updated_at), audited AS (INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) SELECT ?,?,'content.publish',id,'',? FROM changed) SELECT changed.*,publication.revision AS publication_revision,publication.updated_at AS publication_updated_at,pg_notify(?,publication.revision::text) AS notification FROM changed CROSS JOIN publication",
  ).bind(now(),row.id,version,now(),id(),c.get("user").id,now(),c.env.PUBLICATION_EVENTS?.channel ?? "mashrouak_publication").first<Row & {publication_revision:number;publication_updated_at:string;notification:string}>();
  if (!rowResult) throw new HTTPException(409, { message: "version_conflict" });
  const {publication_revision,publication_updated_at,notification: _notification,...committed} = rowResult;
  return c.json({ entry: decodeEntry(committed), publication:{revision:publication_revision,updatedAt:publication_updated_at} });
});
cms.post("/:id/state", async (c) => {
  const input = z
    .object({
      status: z.enum(["draft", "archived"]),
      version: z.number().int(),
    })
    .strict()
    .parse(await c.req.json());
  const result = await c.env.DB.prepare(
    "WITH changed AS (UPDATE content SET status=?,published=NULL,published_slug=NULL,published_sort_order=NULL,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *), publication AS (UPDATE publication_state SET revision=revision+1,updated_at=? WHERE id=1 AND EXISTS(SELECT 1 FROM changed) RETURNING revision,updated_at), audited AS (INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) SELECT ?,?,?,id,'',? FROM changed) SELECT changed.*,publication.revision AS publication_revision,publication.updated_at AS publication_updated_at,pg_notify(?,publication.revision::text) AS notification FROM changed CROSS JOIN publication",
  ).bind(input.status,now(),c.req.param("id"),input.version,now(),id(),c.get("user").id,`content.${input.status}`,now(),c.env.PUBLICATION_EVENTS?.channel ?? "mashrouak_publication").first<Row & {publication_revision:number;publication_updated_at:string;notification:string}>();
  if (!result) throw new HTTPException(409, { message: "version_conflict" });
  const {publication_revision,publication_updated_at,notification: _notification,...committed}=result;
  return c.json({entry:decodeEntry(committed),publication:{revision:publication_revision,updatedAt:publication_updated_at}});
});
cms.delete("/:id", async (c) => {
  const version = z.coerce.number().int().parse(c.req.query("version"));
  const result = await c.env.DB.prepare(
    "DELETE FROM content WHERE id=? AND version=? AND published IS NULL AND kind!='settings'",
  )
    .bind(c.req.param("id"), version)
    .run();
  if (!result.meta.changes)
    throw new HTTPException(409, { message: "unpublish_before_delete" });
  await auditStatement(c, "content.delete", c.req.param("id")).run();
  return c.json({ ok: true });
});
cms.get("/:id/revisions", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT r.id,r.version,r.created_at,u.name AS actor_name FROM revisions r LEFT JOIN users u ON u.id=r.actor_id WHERE content_id=? ORDER BY version DESC LIMIT 50",
  )
    .bind(c.req.param("id"))
    .all();
  return c.json({ revisions: rows.results });
});
cms.post("/:id/restore", async (c) => {
  const input = z
    .object({ revisionId: z.uuid(), version: z.number().int() })
    .strict()
    .parse(await c.req.json());
  const previous = await c.env.DB.prepare(
    "SELECT * FROM content WHERE id=? AND version=?",
  )
    .bind(c.req.param("id"), input.version)
    .first<Row>();
  const revision = await c.env.DB.prepare(
    "SELECT data FROM revisions WHERE id=? AND content_id=?",
  )
    .bind(input.revisionId, c.req.param("id"))
    .first<{ data: string }>();
  if (!previous || !revision)
    throw new HTTPException(409, { message: "version_conflict" });
  contentSchemas[previous.kind].parse(JSON.parse(revision.data));
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO revisions(id,content_id,version,data,actor_id,created_at) SELECT ?,id,version,draft,?,? FROM content WHERE id=? AND version=?",
    ).bind(id(), c.get("user").id, now(), previous.id, input.version),
    c.env.DB.prepare(
      "UPDATE content SET draft=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *",
    ).bind(revision.data, now(), previous.id, input.version),
  ]);
  const restored = results[1]?.results[0] as unknown as Row | undefined;
  if (!restored) throw new HTTPException(409, { message: "version_conflict" });
  await auditStatement(c, "content.restore", previous.id).run();
  return c.json({ entry: decodeEntry(restored) });
});
cms.post("/:id/preview", async (c) => {
  const exists = await c.env.DB.prepare("SELECT id FROM content WHERE id=?")
    .bind(c.req.param("id"))
    .first();
  if (!exists) throw new HTTPException(404, { message: "not_found" });
  const token = `${id()}${id()}`;
  await c.env.DB.prepare(
    "INSERT INTO preview_tokens(token_hash,content_id,expires_at) VALUES(?,?,?)",
  )
    .bind(await hash(token), c.req.param("id"), Date.now() + 15 * 60000)
    .run();
  return c.json({ token, expiresIn: 900 });
});
