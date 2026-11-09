import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";


export const mockCloudinaryCredentials = {
  CLOUDINARY_CLOUD_NAME: "mock-cloud",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "mock-secret-never-a-real-credential",
  CLOUDINARY_FOLDER: "mashrouak",
};
const digest = (value: string, encoding: "hex" | "base64" = "hex") =>
  createHash("sha256").update(value).digest(encoding);
export class CloudinaryMock {
  mode:
    "ok" | "authentication" | "network" | "bad_response" | "destroy_failure" =
    "ok";
  assets = new Map<
    string,
    { bytes: Uint8Array; type: string; format: string; version: number }
  >();
  calls: { path: string; publicId: string }[] = [];
  beforeUploadReply?: () => Promise<void>;
  fetch = async (request: Request): Promise<Response> => {
    try {
      return await this.handle(request);
    } catch (error) {
      if (this.mode !== "network")
        console.error("Cloudinary mock failure:", error);
      throw error;
    }
  };
  private handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    // No unmocked Internet access: an unexpected endpoint fails the test.
    assert.ok(
      ["api.cloudinary.com", "res.cloudinary.com"].includes(url.hostname),
      `Unexpected provider ${url.hostname}`,
    );
    if (this.mode === "network")
      throw new Error("Simulated provider connection failure");
    if (this.mode === "authentication")
      return Response.json(
        { error: { message: "mock-secret-must-not-leak" } },
        { status: 401 },
      );
    if (url.hostname === "res.cloudinary.com") {
      const match = url.pathname.match(
        /^\/mock-cloud\/image\/authenticated\/s--([^/]+)--\/(c_limit,h_1920,w_1920\/f_webp,q_auto)\/v(\d+)\/(.+)\.([a-z]+)$/,
      );
      assert.ok(
        match,
        "Public proxy requests a signed, optimized authenticated CDN asset",
      );
      const [, signature, transformation, version, publicId, format] = match;
      assert.equal(
        signature,
        digest(
          `${transformation}/${publicId}.${format}${mockCloudinaryCredentials.CLOUDINARY_API_SECRET}`,
          "base64",
        )
          .slice(0, 8)
          .replaceAll("+", "-")
          .replaceAll("/", "_"),
      );
      const asset = this.assets.get(publicId!);
      if (!asset || asset.version !== Number(version))
        return new Response("", { status: 404 });
      this.calls.push({ path: "cdn", publicId: publicId! });
      return new Response(new Uint8Array(asset.bytes).buffer, {
        headers: {
          "Content-Type": asset.type,
          "Cache-Control": "public,max-age=31536000",
          "X-Provider-Secret": "must-not-forward",
        },
      });
    }
    const form =
      request.method === "GET" ? url.searchParams : await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of form.entries())
      if (!["file", "api_key", "signature"].includes(key))
        params[key] = String(value);
    const expected = digest(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + mockCloudinaryCredentials.CLOUDINARY_API_SECRET,
    );
    assert.equal(
      form.get("api_key"),
      mockCloudinaryCredentials.CLOUDINARY_API_KEY,
    );
    assert.equal(
      form.get("signature"),
      expected,
      "Provider verifies the outgoing REST signature independently",
    );
    assert.equal(
      form.get("type"),
      "authenticated",
      "Every stored image is protected, including public images",
    );
    const publicId = String(form.get("public_id"));
    const action = url.pathname.split("/").pop()!;
    this.calls.push({ path: action, publicId });
    if (action === "upload") {
      assert.equal(form.get("overwrite"), "false");
      assert.equal(form.get("eager"), "c_limit,h_1920,w_1920/f_webp,q_auto");
      const file = form.get("file");
      assert.ok(file && typeof file !== "string");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const format =
        file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1]!;
      const version = this.calls.length + 100;
      this.assets.set(publicId, { bytes, type: file.type, format, version });
      await this.beforeUploadReply?.();
      return Response.json({
        asset_id: crypto.randomUUID(),
        public_id: publicId,
        resource_type: "image",
        type: this.mode === "bad_response" ? "upload" : "authenticated",
        format,
        bytes: bytes.length,
        width: 1,
        height: 1,
        version,
        secure_url: `https://res.cloudinary.com/mock-cloud/image/authenticated/v${version}/${publicId}.${format}`,
        eager: [{ transformation: "c_limit,h_1920,w_1920/f_webp,q_auto" }],
      });
    }
    if (action === "destroy") {
      assert.equal(form.get("invalidate"), "true");
      if (this.mode === "destroy_failure")
        return Response.json({ error: "mock-error" }, { status: 503 });
      return Response.json({
        result: this.assets.delete(publicId) ? "ok" : "not found",
      });
    }
    if (action === "download") {
      assert.ok(Number(form.get("expires_at")) > Date.now() / 1000);
      assert.ok(Number(form.get("expires_at")) <= Date.now() / 1000 + 61);
      const asset = this.assets.get(publicId);
      return asset
        ? new Response(new Uint8Array(asset.bytes).buffer, { headers: { "Content-Type": asset.type } })
        : new Response("", { status: 404 });
    }
    throw new Error(`Unexpected Cloudinary operation: ${action}`);
  };
}
export async function applyTestMigrations(db: {
  prepare: (sql: string) => { run: () => Promise<unknown> };
}) {
  for (const file of (await readdir("backend/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(`backend/migrations/${file}`, "utf8");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
}
