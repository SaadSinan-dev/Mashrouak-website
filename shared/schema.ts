import { z } from "zod";

const text = z.string().trim().max(12000);
export const bilingual = z.object({ ar: text, en: text }).strict();
const requiredText = bilingual.refine(
  (v) => v.ar.length > 0 && v.en.length > 0,
  "Arabic and English content are required",
);
export const safeLink = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (/^\/(?!\/)/.test(v) && !/[\\\s<>]/.test(v)) ||
      /^https:\/\//.test(v),
    "Use an internal path or HTTPS URL",
  );
export const mediaRef = z.object({ url: safeLink, alt: bilingual }).strict();
const paragraphList = z.array(bilingual).max(60);
export const projectSchema = z
  .object({
    name: requiredText,
    category: z.enum(["web", "commerce", "mobile", "systems"]),
    categoryLabel: requiredText,
    tagline: requiredText,
    overview: requiredText,
    challenge: bilingual,
    solution: bilingual,
    designApproach: bilingual,
    features: paragraphList,
    developmentHighlights: paragraphList,
    goals: paragraphList,
    technologies: z.array(z.string().trim().min(1).max(80)).max(30),
    services: paragraphList,
    cover: mediaRef.nullable(),
    gallery: z.array(mediaRef).max(20),
    externalUrl: safeLink,
    illustrative: z.boolean(),
    featured: z.boolean(),
    accent: z.enum(["teal", "ivory", "petrol"]),
    seoTitle: bilingual,
    seoDescription: bilingual,
  })
  .strict();
export const serviceSchema = z
  .object({
    title: requiredText,
    summary: requiredText,
    businessValue: bilingual,
    includes: paragraphList,
    deliverables: paragraphList,
    suitableFor: bilingual,
    icon: z.enum([
      "website",
      "store",
      "mobile",
      "webapp",
      "system",
      "integration",
    ]),
  })
  .strict();
export const resultSchema = z
  .object({
    title: requiredText,
    description: requiredText,
    before: z.number().finite(),
    after: z.number().finite(),
    unit: requiredText,
    period: bilingual,
    projectSlug: z.string().max(100),
    methodology: bilingual,
    evidence: z.array(z.object({ label: requiredText, url: safeLink })).max(10),
    verification: z.enum(["verified", "demonstration", "draft"]),
    approvedBy: z.string().max(120),
  })
  .strict();
export const sectionKinds = [
  "hero",
  "challenges",
  "services",
  "projects",
  "results",
  "why",
  "process",
  "faq",
  "cta",
  "text",
  "image",
] as const;
export const sectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    kind: z.enum(sectionKinds),
    visible: z.boolean(),
    background: z.enum(["default", "ivory", "mist", "petrol"]),
    title: bilingual,
    body: bilingual,
    image: mediaRef.nullable(),
    buttonLabel: bilingual,
    buttonUrl: safeLink,
  })
  .strict();
export const pageSchema = z
  .object({
    title: requiredText,
    description: bilingual,
    seoTitle: bilingual,
    seoDescription: bilingual,
    sections: z.array(sectionSchema).max(30),
  })
  .strict();
const navItem = z
  .object({
    label: requiredText,
    to: safeLink.refine(Boolean, "A destination is required"),
  })
  .strict();
export const settingsSchema = z
  .object({
    companyName: requiredText,
    description: bilingual,
    footerText: bilingual,
    email: z.email(),
    whatsapp: z.string().regex(/^\d{8,16}$/),
    instagram: safeLink,
    navigation: z.array(navItem).max(9),
    ctaLabel: bilingual,
    ctaUrl: safeLink,
    seoTitle: bilingual,
    seoDescription: bilingual,
    logoArLight: safeLink,
    logoArDark: safeLink,
    logoEnLight: safeLink,
    logoEnDark: safeLink,
    defaultLanguage: z.enum(["ar", "en"]),
    defaultTheme: z.enum(["light", "dark"]),
    chatEnabled: z.boolean(),
    aiEnabled: z.boolean(),
    translations: z
      .object({
        ar: z.record(z.string().max(120), text),
        en: z.record(z.string().max(120), text),
      })
      .strict(),
  })
  .strict();
export const knowledgeSchema = z
  .object({ title: requiredText, body: requiredText })
  .strict();
export const kinds = [
  "pages",
  "services",
  "projects",
  "results",
  "settings",
  "knowledge",
] as const;
export type ContentKind = (typeof kinds)[number];
export const contentSchemas = {
  pages: pageSchema,
  services: serviceSchema,
  projects: projectSchema,
  results: resultSchema,
  settings: settingsSchema,
  knowledge: knowledgeSchema,
};
export type ProjectContent = z.infer<typeof projectSchema>;
export type ServiceContent = z.infer<typeof serviceSchema>;
export type ResultContent = z.infer<typeof resultSchema>;
export type PageContent = z.infer<typeof pageSchema>;
export type SettingsContent = z.infer<typeof settingsSchema>;
export type KnowledgeContent = z.infer<typeof knowledgeSchema>;
export type LocalizedText = z.infer<typeof bilingual>;
export type ContentData =
  | ProjectContent
  | ServiceContent
  | ResultContent
  | PageContent
  | SettingsContent
  | KnowledgeContent;
export interface ContentEntry<T = ContentData> {
  id: string;
  kind: ContentKind;
  published_slug?: string | null;
  published_sort_order?: number | null;
  slug: string;
  sort_order: number;
  status: "draft" | "published" | "archived";
  version: number;
  draft: T;
  published: T | null;
  updated_at: string;
}
export interface PublicEntry<T = ContentData> {
  id: string;
  kind: ContentKind;
  slug: string;
  sort_order: number;
  data: T;
}
export interface PublicContent {
  entries: PublicEntry[];
  revision?: number;
  updatedAt: string;
  aiConfigured: boolean;
}
export type Role = "owner" | "editor" | "support";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: number;
}
export interface Message {
  id: string;
  conversation_id: string;
  sender: "visitor" | "operator" | "assistant";
  body: string;
  created_at: string;
  client_id: string;
  read_at: string | null;
  operator_name?: string;
}
export interface Conversation {
  id: string;
  name: string;
  email: string;
  language: "ar" | "en";
  status: "pending" | "active" | "resolved";
  assigned_to: string | null;
  updated_at: string;
  created_at: string;
  preview?: string;
  unread?: number;
  ai_state: "idle" | "running" | "failed";
}
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
export const entryInput = z
  .object({
    kind: z.enum(kinds),
    slug: slugSchema,
    sort_order: z.number().int().min(0).max(10000),
    version: z.number().int().min(0),
    data: z.unknown(),
  })
  .strict();
export const messageInput = z
  .object({ body: z.string().trim().min(1).max(4000), clientId: z.uuid() })
  .strict();
export const conversationInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.union([z.email().max(254), z.literal("")]),
    language: z.enum(["ar", "en"]),
    consent: z.literal(true),
  })
  .strict();
export const inquirySchema = z
  .object({
    language: z.enum(["ar", "en"]).default("ar"),
    fullName: z.string().trim().min(2).max(100),
    businessName: z.string().max(200).optional(),
    email: z.email().max(254),
    serviceType: z.string().min(1).max(100),
    projectDescription: z.string().trim().min(20).max(4000),
    budget: z.string().max(200).optional(),
    timeline: z.string().max(100).optional(),
    additionalDetails: z.string().max(4000).optional(),
  })
  .strict();

export function validatePublication(
  kind: ContentKind,
  data: ContentData,
): string | null {
  if (kind === "results") {
    const result = resultSchema.parse(data);
    if (result.verification === "draft")
      return "Draft results cannot be published";
    if (
      result.verification === "verified" &&
      (!result.evidence.length ||
        result.evidence.some((e) => !e.url) ||
        !result.approvedBy.trim() ||
        !result.period.ar ||
        !result.period.en ||
        !result.methodology.ar ||
        !result.methodology.en)
    )
      return "Verified results need evidence, approval, period and methodology in both languages";
  }
  if (kind === "projects") {
    const project = projectSchema.parse(data);
    if (!project.illustrative && !project.cover)
      return "Published projects need a genuine cover image or an illustrative label";
  }
  return null;
}
