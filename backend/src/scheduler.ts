import type { Env } from "./types";
import { retryMediaCleanup } from "./media";
export async function runCleanup(env: Env) {
  const days = Math.max(1, Math.min(3650, Number(env.CHAT_RETENTION_DAYS) || 90));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(Date.now()),
    env.DB.prepare("DELETE FROM preview_tokens WHERE expires_at<?").bind(Date.now()),
    env.DB.prepare('DELETE FROM preview_snapshots WHERE expires_at<?').bind(Date.now()),
    env.DB.prepare("DELETE FROM rate_limits WHERE reset_at<?").bind(Date.now()),
    env.DB.prepare("DELETE FROM conversations WHERE updated_at<?").bind(cutoff),
    env.DB.prepare("UPDATE conversations SET ai_state='failed' WHERE ai_state='running' AND updated_at<?").bind(new Date(Date.now() - 300000).toISOString()),
  ]);
  await retryMediaCleanup(env);
}
