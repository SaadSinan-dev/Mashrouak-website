import { HTTPException } from "hono/http-exception";
import type { Env } from "./types";

// One eagerly generated derivative: authenticated assets cannot transform on demand.
export const MEDIA_TRANSFORMATION = "c_limit,h_1920,w_1920/f_webp,q_auto";
export const imageFormats: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};
type Credentials = {
  cloud: string;
  key: string;
  secret: string;
  folder: string;
};
export type CloudinaryEnv = Pick<
  Env,
  | "CLOUDINARY_CLOUD_NAME"
  | "CLOUDINARY_API_KEY"
  | "CLOUDINARY_API_SECRET"
  | "CLOUDINARY_FOLDER"
  | "CLOUDINARY_FETCH"
>;
export function cloudinaryConfig(env: CloudinaryEnv): Credentials {
  const cloud = env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const key = env.CLOUDINARY_API_KEY?.trim() ?? "";
  const secret = env.CLOUDINARY_API_SECRET?.trim() ?? "";
  const folder = env.CLOUDINARY_FOLDER?.trim() || "mashrouak";
  if (
    !cloud ||
    !key ||
    !secret ||
    /placeholder|your[_-]/i.test(`${cloud} ${key} ${secret}`)
  )
    throw new HTTPException(503, { message: "cloudinary_not_configured" });
  if (
    !/^[a-zA-Z0-9_-]+$/.test(cloud) ||
    !/^\d+$/.test(key) ||
    !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)
  )
    throw new HTTPException(503, { message: "cloudinary_not_configured" });
  return { cloud, key, secret, folder };
}

// Cloudinary signs sorted, non-URL-encoded parameters with the secret appended.
export async function cloudinarySignature(
  parameters: Record<string, string>,
  secret: string,
) {
  const input =
    Object.keys(parameters)
      .sort()
      .map((k) => `${k}=${parameters[k]}`)
      .join("&") + secret;
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
  );
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function signedForm(
  env: CloudinaryEnv,
  parameters: Record<string, string>,
) {
  const config = cloudinaryConfig(env);
  const params = {
    ...parameters,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.set(k, v);
  form.set("api_key", config.key);
  form.set("signature", await cloudinarySignature(params, config.secret));
  return { config, form };
}
async function providerFetch(
  env: CloudinaryEnv,
  url: string,
  options: RequestInit,
) {
  try {
    const response = await (env.CLOUDINARY_FETCH ?? fetch)(url, {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      const code =
        response.status === 401 || response.status === 403
          ? "cloudinary_authentication_failed"
          : response.status === 429
            ? "cloudinary_rate_limited"
            : "cloudinary_failed";
      throw new HTTPException(502, { message: code });
    }
    return response;
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    // Never propagate provider response text, request URLs, signatures or secrets.
    throw new HTTPException(502, { message: "cloudinary_unavailable" });
  }
}
export interface CloudinaryAsset {
  asset_id: string;
  public_id: string;
  version: number;
  resource_type: "image";
  type: "authenticated";
  format: string;
  bytes: number;
  width: number;
  height: number;
  secure_url: string;
}
export async function uploadCloudinary(
  env: CloudinaryEnv,
  file: Blob,
  publicId: string,
): Promise<CloudinaryAsset> {
  const { config, form } = await signedForm(env, {
    public_id: publicId,
    type: "authenticated",
    overwrite: "false",
    eager: MEDIA_TRANSFORMATION,
    eager_async: "false",
  });
  form.set("file", file, "image");
  const response = await providerFetch(
    env,
    `https://api.cloudinary.com/v1_1/${config.cloud}/image/upload`,
    { method: "POST", body: form },
  );
  let data: CloudinaryAsset & {
    eager?: { transformation: string; secure_url?: string }[];
  };
  try {
    data = await response.json();
  } catch {
    throw new HTTPException(502, { message: "cloudinary_invalid_response" });
  }
  const prefix = `https://res.cloudinary.com/${config.cloud}/image/authenticated/`;
  if (
    data.public_id !== publicId ||
    !data.asset_id ||
    data.resource_type !== "image" ||
    data.type !== "authenticated" ||
    !imageFormats[data.format] ||
    !Number.isSafeInteger(data.version) ||
    data.version < 1 ||
    !Number.isSafeInteger(data.bytes) ||
    data.bytes < 1 ||
    !Number.isSafeInteger(data.width) ||
    data.width < 1 ||
    !Number.isSafeInteger(data.height) ||
    data.height < 1 ||
    typeof data.secure_url !== "string" ||
    !data.secure_url.startsWith(prefix) ||
    !data.eager?.some(
      (e) =>
        e.transformation === `${MEDIA_TRANSFORMATION}.webp` ||
        e.transformation === MEDIA_TRANSFORMATION,
    )
  )
    throw new HTTPException(502, { message: "cloudinary_invalid_response" });
  return data;
}
export async function destroyCloudinary(env: CloudinaryEnv, publicId: string) {
  const { config, form } = await signedForm(env, {
    public_id: publicId,
    type: "authenticated",
    invalidate: "true",
  });
  const response = await providerFetch(
    env,
    `https://api.cloudinary.com/v1_1/${config.cloud}/image/destroy`,
    { method: "POST", body: form },
  );
  const data = (await response.json()) as { result?: string };
  if (data.result !== "ok" && data.result !== "not found")
    throw new HTTPException(502, { message: "cloudinary_invalid_response" });
}
export async function cloudinaryDelivery(
  env: CloudinaryEnv,
  asset: {
    cloudinary_public_id: string;
    cloudinary_format: string;
    cloudinary_version: number;
  },
  optimized: boolean,
) {
  const config = cloudinaryConfig(env);
  if (
    !/^[a-zA-Z0-9_/-]+$/.test(asset.cloudinary_public_id) ||
    !imageFormats[asset.cloudinary_format] ||
    !Number.isSafeInteger(asset.cloudinary_version)
  )
    throw new HTTPException(503, { message: "media_migration_required" });
  if (!optimized) {
    const { form } = await signedForm(env, {
      public_id: asset.cloudinary_public_id,
      format: asset.cloudinary_format,
      type: "authenticated",
      attachment: "false",
      expires_at: String(Math.floor(Date.now() / 1000) + 60),
    });
    const query = new URLSearchParams();
    for (const [k, v] of form) query.set(k, String(v));
    return providerFetch(
      env,
      `https://api.cloudinary.com/v1_1/${config.cloud}/image/download?${query}`,
      { method: "GET" },
    );
  }
  const source = `${asset.cloudinary_public_id}.${asset.cloudinary_format}`;
  const bytes = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        `${MEDIA_TRANSFORMATION}/${source}${config.secret}`,
      ),
    ),
  );
  const signature = btoa(String.fromCharCode(...bytes))
    .slice(0, 8)
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  const url = `https://res.cloudinary.com/${config.cloud}/image/authenticated/s--${signature}--/${MEDIA_TRANSFORMATION}/v${asset.cloudinary_version}/${source}`;
  return providerFetch(env, url, { method: "GET" });
}
