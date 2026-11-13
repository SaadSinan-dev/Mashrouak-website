import { z } from 'zod';

const safeUrl = z.string().url().refine((value) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } });
const projectSchema = z.object({
  id: z.string().min(1).max(200).regex(/^[\w-]+$/),
  title: z.string().trim().min(1), titleAr: z.string().default(''),
  shortDescription: z.string().default(''), shortDescriptionAr: z.string().default(''),
  description: z.string().default(''), descriptionAr: z.string().default(''),
  focus: z.string().default(''), focusAr: z.string().default(''),
  features: z.array(z.string()).default([]), featuresAr: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  category: z.enum(['web', 'mobile']), featured: z.boolean().default(false),
  order: z.number().finite().default(0), images: z.array(safeUrl).default([]),
  liveUrl: z.union([safeUrl, z.literal('')]).default(''),
  githubUrl: z.union([safeUrl, z.literal('')]).default(''),
});
const feedSchema = z.object({ version: z.literal(1), projects: z.array(projectSchema).max(500) });
export type PortfolioProject = z.infer<typeof projectSchema>;
export const FEED_URL = import.meta.env.VITE_PORTFOLIO_PROJECTS_URL?.trim() || 'https://saad-dev-portfolio.netlify.app/.netlify/functions/public-projects';
export const REFRESH_MS = 5 * 60 * 1000;

export function normalizeFeed(input: unknown): PortfolioProject[] {
  const feed = feedSchema.parse(input);
  const seen = new Set<string>();
  return feed.projects.filter((project) => {
    if (seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

let inFlight: Promise<PortfolioProject[]> | null = null;
export function fetchProjectFeed(): Promise<PortfolioProject[]> {
  if (!inFlight) inFlight = (async () => {
    const response = await fetch(FEED_URL, { cache: 'no-cache', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Projects feed returned ${response.status}`);
    return normalizeFeed(await response.json());
  })().finally(() => { inFlight = null; });
  return inFlight;
}

export function projectText(project: PortfolioProject, language: 'ar' | 'en') {
  const pick = (english: string, arabic: string) => language === 'ar' ? arabic || english : english || arabic;
  return {
    title: pick(project.title, project.titleAr),
    shortDescription: pick(project.shortDescription, project.shortDescriptionAr) || pick(project.description, project.descriptionAr),
    description: pick(project.description, project.descriptionAr) || pick(project.shortDescription, project.shortDescriptionAr),
    focus: pick(project.focus, project.focusAr),
    features: language === 'ar' && project.featuresAr.length ? project.featuresAr : project.features,
  };
}
