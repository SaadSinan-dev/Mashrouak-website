import type { Context } from "hono";
import type { Database } from "./database";
import type { PublicationEvents } from "./publication";
import type { User } from "../../shared/schema";
export interface Env {
  DB: Database;
  CLIENT_IP?: string;
  CLOUDINARY_FETCH?: typeof fetch;
  PUBLICATION_EVENTS?: PublicationEvents;
  SHUTDOWN_SIGNAL?: AbortSignal;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER?: string;
  PUBLIC_ORIGIN: string;
  ADMIN_ORIGIN: string;
  SITE_URL: string;
  ENVIRONMENT: string;
  AI_PROVIDER?: string;
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  CHAT_RETENTION_DAYS?: string;
}
export type AppEnv = { Bindings: Env; Variables: { user: User } };
export type Ctx = Context<AppEnv>;
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
