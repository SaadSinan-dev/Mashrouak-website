import assert from "node:assert/strict";
import { createTestPlatform } from "./postgres-fixture";
import { hash, passwordHash } from "../backend/src/security";
import { CloudinaryMock } from "./cloudinary.mock";

// Native Node.js application with an isolated real PostgreSQL schema and mocked Cloudinary.
const cloudinary = new CloudinaryMock();
const platform = await createTestPlatform({cloudinary});
let checks = 0;
const check = (condition: unknown, label: string) => {
  assert.ok(condition, label);
  checks++;
};
type Client = { cookie: string; origin: string; ip: string };
const client = (admin = false): Client => ({
  cookie: "",
  origin: `http://localhost:${admin ? 5174 : 5173}`,
  ip: crypto.randomUUID(),
});
async function request(
  who: Client,
  path: string,
  method = "GET",
  body?: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    Origin: who.origin,
    "CF-Connecting-IP": who.ip,
    "X-Mashrouak-Request": "1",
    Cookie: who.cookie,
    ...extra,
  };
  if (body && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  let encoded: string | ArrayBuffer | undefined =
    body === undefined ? undefined : JSON.stringify(body);
  if (body instanceof FormData) {
    const multipart = new Request("http://localhost/", {
      method: "POST",
      body,
    });
    headers["Content-Type"] = multipart.headers.get("content-type")!;
    encoded = await multipart.arrayBuffer();
  }
  const response = await platform.dispatchFetch(`http://localhost/api${path}`, {
    method,
    headers,
    body: encoded,
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) who.cookie = setCookie.split(";")[0]!;
  const payload =
    method !== "HEAD" && response.headers.get("content-type")?.includes("json")
      ? ((await response.json()) as any)
      : await response.text();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(payload)}`,
  );
  checks++;
  return { payload, response };
}
const text = (value: string) => ({ ar: value, en: value });
try {
  const db = await platform.getDatabase();
  const password = `${crypto.randomUUID()}-Test`;
  const ownerId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)",
    )
    .bind(
      ownerId,
      "qa@example.test",
      "QA owner",
      await passwordHash(password),
      "owner",
    )
    .run();
  const owner = client(true),
    editor = client(true),
    support = client(true),
    visitor = client(),
    other = client();
  await request(visitor, "/health");
  await request(visitor, "/admin/content", "GET", undefined, 401);
  await request(
    { ...visitor, origin: "https://untrusted.example" },
    "/health",
    "GET",
    undefined,
    403,
  );
  await request(
    owner,
    "/auth/login",
    "POST",
    { email: "qa@example.test", password },
    403,
    { "X-Mashrouak-Request": "" },
  );
  await request(
    owner,
    "/auth/login",
    "POST",
    { email: "qa@example.test", password: "incorrect" },
    401,
  );
  const login = await request(owner, "/auth/login", "POST", {
    email: "qa@example.test",
    password,
  });
  check(
    login.response.headers.get("set-cookie")?.includes("HttpOnly") &&
      login.response.headers.get("set-cookie")?.includes("SameSite=Strict"),
    "Secure session attributes",
  );
  check(!owner.cookie.includes(password), "Session is opaque");
  await request(owner, "/auth/me");
  for (const [role, who] of [
    ["editor", editor],
    ["support", support],
  ] as const) {
    await request(
      owner,
      "/admin/users",
      "POST",
      { name: role, email: `${role}@example.test`, password, role },
      201,
    );
    await request(who, "/auth/login", "POST", {
      email: `${role}@example.test`,
      password,
    });
  }
  await request(editor, "/admin/users", "GET", undefined, 403);
  await request(editor, "/admin/inbox", "GET", undefined, 403);
  await request(support, "/admin/content", "GET", undefined, 403);
  await request(support, "/media", "GET", undefined, 403);
  const pageData = {
    title: text("QA page"),
    description: text("A private draft"),
    seoTitle: text(""),
    seoDescription: text(""),
    sections: [],
  };
  let entry = (
    await request(
      editor,
      "/admin/content",
      "POST",
      {
        kind: "pages",
        slug: "qa-page",
        sort_order: 0,
        version: 0,
        data: pageData,
      },
      201,
    )
  ).payload.entry;
  check(
    !(await request(visitor, "/public/content")).payload.entries.length,
    "Draft is private",
  );
  entry = (
    await request(editor, `/admin/content/${entry.id}/publish`, "POST", {
      version: entry.version,
    })
  ).payload.entry;
  const publishedTitle = entry.published.title.en;
  const saveInput = {
    kind: "pages",
    slug: entry.slug,
    sort_order: 0,
    version: entry.version,
    data: { ...pageData, title: text("Edited draft") },
  };
  entry = (
    await request(editor, `/admin/content/${entry.id}`, "PUT", saveInput)
  ).payload.entry;
  await request(editor, `/admin/content/${entry.id}`, "PUT", saveInput, 409);
  check(
    (await request(visitor, "/public/content")).payload.entries[0].data.title
      .en === publishedTitle,
    "Draft changes do not leak",
  );
  const preview = (
    await request(editor, `/admin/content/${entry.id}/preview`, "POST")
  ).payload;
  check(
    (await request(visitor, `/preview/${preview.token}`)).payload.entries[0]
      .data.title.en === "Edited draft",
    "Preview renders draft",
  );
  await db.prepare("UPDATE preview_tokens SET expires_at=0").run();
  await request(visitor, `/preview/${preview.token}`, "GET", undefined, 404);
  const revisions = (
    await request(editor, `/admin/content/${entry.id}/revisions`)
  ).payload.revisions;
  check(revisions.length === 1, "Revisions saved");
  entry = (
    await request(editor, `/admin/content/${entry.id}/restore`, "POST", {
      revisionId: revisions[0].id,
      version: entry.version,
    })
  ).payload.entry;
  check(entry.draft.title.en === publishedTitle, "Revision restores draft");
  await request(
    editor,
    `/admin/content/${entry.id}?version=${entry.version}`,
    "DELETE",
    undefined,
    409,
  );
  entry = (
    await request(editor, `/admin/content/${entry.id}/state`, "POST", {
      status: "archived",
      version: entry.version,
    })
  ).payload.entry;
  await request(
    editor,
    `/admin/content/${entry.id}?version=${entry.version}`,
    "DELETE",
  );
  let resultData = {
    title: text("QA metric"),
    description: text("Test only"),
    before: 3,
    after: 6,
    unit: text("units"),
    period: text(""),
    projectSlug: "",
    methodology: text(""),
    evidence: [],
    verification: "verified",
    approvedBy: "",
  };
  let result = (
    await request(
      editor,
      "/admin/content",
      "POST",
      {
        kind: "results",
        slug: "qa-result",
        sort_order: 0,
        version: 0,
        data: resultData,
      },
      201,
    )
  ).payload.entry;
  await request(
    editor,
    `/admin/content/${result.id}/publish`,
    "POST",
    { version: result.version },
    422,
  );
  for (const verification of ["draft", "demonstration"]) {
    resultData = { ...resultData, verification };
    result = (
      await request(editor, `/admin/content/${result.id}`, "PUT", {
        kind: "results",
        slug: "qa-result",
        sort_order: 0,
        version: result.version,
        data: resultData,
      })
    ).payload.entry;
    const published = await request(
      editor,
      `/admin/content/${result.id}/publish`,
      "POST",
      { version: result.version },
      verification === "draft" ? 422 : 200,
    );
    if (verification === "demonstration")
      check(
        published.payload.entry.published.verification === "demonstration",
        "Demonstration label retained",
      );
  }
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = (visibility: string, bytes = png, type = "image/png") => {
    const form = new FormData();
    form.set("file", new File([bytes], "qa.png", { type }));
    form.set("alt_ar", "صورة اختبار");
    form.set("alt_en", "Test image");
    form.set("visibility", visibility);
    return form;
  };
  await request(
    editor,
    "/media",
    "POST",
    upload("public", Buffer.from("invalid-image-data")),
    422,
  );
  const media = (await request(editor, "/media", "POST", upload("public"), 201))
    .payload;
  const mediaItems = (await request(editor, "/media")).payload.media;
  const publicImage = mediaItems[0];
  check(
    !!media.id || !!media.url || !!media.media,
    "Upload returns identifier",
  );
  await request(visitor, `/media/${publicImage.id}`);
  await request(editor, "/media", "POST", upload("private"), 201);
  const privateImage = (await request(editor, "/media")).payload.media.find(
    (m: any) => m.visibility === "private",
  );
  await request(visitor, `/media/${privateImage.id}`, "GET", undefined, 404);
  await request(editor, `/media/${privateImage.id}`);
  const providerCalls = cloudinary.calls.length;
  await request(support, `/media/${privateImage.id}`, "GET", undefined, 404);
  await request(visitor, `/media/${privateImage.id}`, "HEAD", undefined, 404);
  await request(visitor, "/media", "POST", upload("public"), 401);
  await request(support, "/media", "POST", upload("public"), 403);
  check(
    cloudinary.calls.length === providerCalls,
    "Unauthorized requests never reach Cloudinary",
  );
  const delivery = await request(visitor, `/media/${publicImage.id}`);
  check(
    delivery.response.headers.get("cache-control") === "private, no-cache, must-revalidate",
    "Stable public routes revalidate through authorization before cached bytes are reused",
  );
  check(
    !delivery.response.headers.has("location") &&
      !delivery.response.headers.has("x-provider-secret"),
    "Provider URLs and headers are not exposed",
  );
  const callsBeforeRevalidation=cloudinary.calls.length;
  await request(visitor,`/media/${publicImage.id}`,'GET',undefined,304,{'If-None-Match':delivery.response.headers.get('etag')!});
  check(cloudinary.calls.length===callsBeforeRevalidation,'Unchanged public images reuse browser bytes without downloading from provider');
  await request(visitor,`/media/${privateImage.id}`,'GET',undefined,404,{'If-None-Match':delivery.response.headers.get('etag')!});
  const privateDelivery = await request(editor, `/media/${privateImage.id}`);
  check(
    privateDelivery.response.headers.get("x-robots-tag") ===
      "noindex, noarchive",
    "Private evidence is excluded from indexing",
  );
  check(
    !JSON.stringify(mediaItems).includes("cloudinary.com"),
    "Media listing does not disclose provider delivery URLs",
  );
  await request(
    editor,
    "/media",
    "POST",
    upload("public", png, "image/jpeg"),
    422,
  );
  await request(
    editor,
    "/media",
    "POST",
    upload("public", Buffer.alloc(5 * 1024 * 1024 + 1)),
    422,
  );
  const invalidAlt = upload("public");
  invalidAlt.set("alt_ar", "");
  await request(editor, "/media", "POST", invalidAlt, 422);
  const original = await db
    .prepare("SELECT * FROM media WHERE id=?")
    .bind(publicImage.id)
    .first<any>();
  check(
    !!original.cloudinary_asset_id &&
      original.cloudinary_delivery_type === "authenticated",
    "D1 persists provider metadata",
  );
  await request(editor, `/media/${publicImage.id}`, "PUT", {
    alt_ar: "وصف جديد",
    alt_en: "New description",
    visibility: "private",
    revision: 1,
  });
  await request(visitor, `/media/${publicImage.id}`, "GET", undefined, 404);
  await request(editor, `/media/${publicImage.id}`);
  await request(
    editor,
    `/media/${publicImage.id}`,
    "PUT",
    {
      alt_ar: "وصف جديد",
      alt_en: "New description",
      visibility: "public",
      revision: 1,
    },
    409,
  );
  await request(editor, `/media/${publicImage.id}`, "PUT", {
    alt_ar: "وصف جديد",
    alt_en: "New description",
    visibility: "public",
    revision: 2,
  });
  await request(visitor, `/media/${publicImage.id}`);
  const replacement = upload("public");
  replacement.set("revision", "3");
  const replaced = await request(
    editor,
    `/media/${publicImage.id}/replace`,
    "POST",
    replacement,
  );
  check(
    replaced.payload.id === publicImage.id &&
      replaced.payload.url === media.url,
    "Replacement preserves ID and canonical content URL",
  );
  const updated = await db
    .prepare("SELECT * FROM media WHERE id=?")
    .bind(publicImage.id)
    .first<any>();
  check(
    updated.created_at === original.created_at &&
      updated.revision === 4 &&
      updated.cloudinary_public_id !== original.cloudinary_public_id,
    "Replacement preserves creation time and increments revision",
  );
  check(
    !cloudinary.assets.has(original.cloudinary_public_id),
    "Replacement deletes the old provider asset",
  );
  const staleReplacement = upload("public");
  staleReplacement.set("revision", "3");
  await request(
    editor,
    `/media/${publicImage.id}/replace`,
    "POST",
    staleReplacement,
    409,
  );
  cloudinary.beforeUploadReply = async () => {
    await db
      .prepare("UPDATE media SET revision=revision+1 WHERE id=?")
      .bind(publicImage.id)
      .run();
  };
  const racing = upload("public");
  racing.set("revision", "4");
  await request(
    editor,
    `/media/${publicImage.id}/replace`,
    "POST",
    racing,
    409,
  );
  cloudinary.beforeUploadReply = undefined;
  check(
    (
      await db
        .prepare("SELECT cloudinary_public_id FROM media WHERE id=?")
        .bind(publicImage.id)
        .first<any>()
    ).cloudinary_public_id === updated.cloudinary_public_id,
    "Concurrent replacement cannot overwrite a newer edit",
  );
  const usedId = crypto.randomUUID();
  const usedData = { ...pageData, description: text(media.url) };
  await db
    .prepare(
      "INSERT INTO content(id,kind,slug,draft,updated_at) VALUES(?,'pages','media-usage',?,?)",
    )
    .bind(usedId, JSON.stringify(usedData), new Date().toISOString())
    .run();
  check(
    (await request(editor, "/media")).payload.media
      .find((m: any) => m.id === publicImage.id)
      .usage.some((u: any) => u.id === usedId),
    "Usage tracking finds existing canonical references",
  );
  await request(editor, `/media/${publicImage.id}`, "DELETE", undefined, 409);
  await request(editor, `/admin/content/${usedId}/publish`, "POST", {
    version: 1,
  });
  await request(
    editor,
    `/media/${publicImage.id}`,
    "PUT",
    { alt_ar: "خاص", alt_en: "Private", visibility: "private", revision: 5 },
    409,
  );
  await request(editor, `/admin/content/${usedId}/state`, "POST", {
    status: "draft",
    version: 2,
  });
  await db
    .prepare(
      "INSERT INTO revisions(id,content_id,version,data,created_at) VALUES(?,?,1,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      usedId,
      JSON.stringify(usedData),
      new Date().toISOString(),
    )
    .run();
  await db
    .prepare("UPDATE content SET draft=? WHERE id=?")
    .bind(JSON.stringify(pageData), usedId)
    .run();
  await request(editor, `/media/${publicImage.id}`, "DELETE", undefined, 409);
  check(
    (await request(editor, "/media")).payload.media.find(
      (m: any) => m.id === publicImage.id,
    ).usage.length === 1,
    "Historical revisions protect referenced media",
  );
  const privateUsed = {
    ...pageData,
    description: text(`/api/media/${privateImage.id}`),
  };
  await db
    .prepare("UPDATE content SET draft=? WHERE id=?")
    .bind(JSON.stringify(privateUsed), usedId)
    .run();
  await request(
    editor,
    `/admin/content/${usedId}/publish`,
    "POST",
    { version: 3 },
    422,
  );
  await db.prepare("DELETE FROM content WHERE id=?").bind(usedId).run();
  const beforeFailure = cloudinary.assets.size;
  await db.prepare("CREATE FUNCTION mock_fail_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'mock persistence failure'; END $$").run();
  await db
    .prepare(
      "CREATE TRIGGER mock_persistence_failure BEFORE INSERT ON media FOR EACH ROW EXECUTE FUNCTION mock_fail_insert()",
    )
    .run();
  await request(editor, "/media", "POST", upload("public"), 500);
  await db.prepare("DROP TRIGGER mock_persistence_failure ON media").run();
  check(
    cloudinary.assets.size === beforeFailure,
    "A failed D1 insert cleans up the uploaded asset",
  );
  for (const mode of ["authentication", "network", "bad_response"] as const) {
    cloudinary.mode = mode;
    const failed = await request(
      editor,
      "/media",
      "POST",
      upload("public"),
      502,
    );
    check(
      !JSON.stringify(failed.payload).includes("mock-secret"),
      `${mode} error is sanitized`,
    );
  }
  cloudinary.mode = "ok";
  const removable = (
    await request(editor, "/media", "POST", upload("public"), 201)
  ).payload;
  cloudinary.mode = "destroy_failure";
  const deleted = await request(editor, `/media/${removable.id}`, "DELETE");
  check(
    deleted.payload.cleanup_pending === true,
    "Deletion retains durable cleanup when the provider is unavailable",
  );
  await request(visitor, `/media/${removable.id}`, "GET", undefined, 404);
  const pendingCleanup = await db
    .prepare("SELECT count(*) AS count FROM media_cleanup")
    .first<any>();
  check(
    pendingCleanup.count > 0,
    "Failed or uncertain operations are durably journaled",
  );
  cloudinary.mode = "ok";
  await db.prepare("UPDATE media_cleanup SET not_before=0").run();
  const scheduled = await platform.runScheduled();
  check(scheduled.outcome === "ok", "Scheduled cleanup completes successfully");
  check(
    (
      await db
        .prepare("SELECT count(*) AS count FROM media_cleanup")
        .first<any>()
    ).count === 0,
    "Scheduled cleanup removes failed and uncertain uploads",
  );
  await request(editor, `/media/${publicImage.id}`, "DELETE");
  check(
    !cloudinary.assets.has(updated.cloudinary_public_id),
    "Unused assets are deleted from Cloudinary",
  );
  const legacyId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO media(id,object_key,filename,type,size,alt_ar,alt_en,visibility,created_at) VALUES(?,'legacy/key','legacy.png','image/png',68,'قديم','Legacy','private','2020-01-01')",
    )
    .bind(legacyId)
    .run();
  await request(visitor, `/media/${legacyId}`, "GET", undefined, 404);
  const legacy = await request(
    editor,
    `/media/${legacyId}`,
    "GET",
    undefined,
    503,
  );
  check(
    legacy.payload.error === "media_migration_required",
    "Historical records are preserved and explicitly await migration",
  );
  const auditActions = (
    await db
      .prepare(
        "SELECT DISTINCT action FROM audit_logs WHERE action LIKE 'media.%'",
      )
      .all<any>()
  ).results.map((r: any) => r.action);
  check(
    ["media.upload", "media.edit", "media.replace", "media.delete"].every((a) =>
      auditActions.includes(a),
    ),
    "All media mutations retain audit history",
  );
  const missing = await createTestPlatform({cloudinary,credentials:false});
  try {
    const emptyDb = await missing.getDatabase();
    await emptyDb
      .prepare(
        "INSERT INTO users(id,email,name,password_hash,role) VALUES('missing','missing@example.test','Missing','unused','owner')",
      )
      .run();
    await emptyDb
      .prepare("INSERT INTO sessions VALUES(?,'missing',?)")
      .bind(await hash("missing-config-session"), Date.now() + 60000)
      .run();
    const encoded = new Request("http://localhost/", {
      method: "POST",
      body: upload("public"),
    });
    const noConfig = await missing.dispatchFetch("http://localhost/api/media", {
      method: "POST",
      body: await encoded.arrayBuffer(),
      headers: {
        "Content-Type": encoded.headers.get("content-type")!,
        Origin: "http://localhost:5174",
        "X-Mashrouak-Request": "1",
        Cookie: "mashrouak_admin=missing-config-session",
      },
    });
    check(
      noConfig.status === 503 &&
        ((await noConfig.json()) as any).error === "cloudinary_not_configured",
      "Missing credentials return an actionable error through the real API",
    );
  } finally {
    await missing.dispose();
  }
  await request(visitor, "/chat/session");
  await request(other, "/chat/session");
  await request(
    visitor,
    "/chat/conversations",
    "POST",
    { name: "Visitor", email: "", language: "en", consent: false },
    422,
  );
  const conversation = (
    await request(
      visitor,
      "/chat/conversations",
      "POST",
      { name: "Visitor", email: "", language: "en", consent: true },
      201,
    )
  ).payload.conversation;
  check(
    (
      await request(visitor, "/chat/conversations", "POST", {
        name: "Visitor",
        email: "",
        language: "en",
        consent: true,
      })
    ).payload.conversation.id === conversation.id,
    "Start is idempotent",
  );
  await request(
    other,
    `/chat/conversations/${conversation.id}`,
    "GET",
    undefined,
    404,
  );
  const message = {
    body: "A real persisted test message",
    clientId: crypto.randomUUID(),
  };
  await request(
    visitor,
    `/chat/conversations/${conversation.id}/messages`,
    "POST",
    message,
    201,
  );
  check(
    (
      await request(
        visitor,
        `/chat/conversations/${conversation.id}/messages`,
        "POST",
        message,
        201,
      )
    ).payload.messages.length === 1,
    "Message retry is idempotent",
  );
  check(
    (await request(visitor, "/chat/session")).payload.conversation.id ===
      conversation.id,
    "Session restores conversation",
  );
  await request(support, `/admin/inbox/${conversation.id}/read`, "POST");
  check(
    (await request(visitor, `/chat/conversations/${conversation.id}`)).payload
      .messages[0].read_at,
    "Staff read acknowledgement",
  );
  await request(
    support,
    `/admin/inbox/${conversation.id}/messages`,
    "POST",
    { body: "A genuine staff reply", clientId: crypto.randomUUID() },
    201,
  );
  check(
    (await request(visitor, `/chat/conversations/${conversation.id}`)).payload
      .messages[1].body === "A genuine staff reply",
    "Visitor receives saved staff reply",
  );
  await request(visitor, `/chat/conversations/${conversation.id}/read`, "POST");
  check(
    (await request(support, `/admin/inbox/${conversation.id}`)).payload
      .messages[1].read_at,
    "Visitor read acknowledgement",
  );
  await request(
    visitor,
    `/chat/conversations/${conversation.id}/assistant`,
    "POST",
    undefined,
    503,
  );
  check(
    (await request(visitor, `/chat/conversations/${conversation.id}`)).payload
      .messages.length === 2,
    "Unavailable AI never invents a reply",
  );
  await request(owner, `/admin/inbox/${conversation.id}`, "PATCH", {
    status: "resolved",
    assignedTo: ownerId,
  });
  await request(
    visitor,
    `/chat/conversations/${conversation.id}/messages`,
    "POST",
    { body: "Closed", clientId: crypto.randomUUID() },
    409,
  );
  check(
    (await request(owner, "/admin/audit")).payload.logs.some(
      (log: any) => log.action === "content.publish",
    ),
    "Audit records publication",
  );
  await request(owner, "/auth/logout", "POST");
  await request(owner, "/auth/me", "GET", undefined, 401);
  console.log(
    `PASS: ${checks} integration assertions against isolated Node.js/PostgreSQL and mocked Cloudinary`,
  );
} finally {
  await platform.dispose();
}
