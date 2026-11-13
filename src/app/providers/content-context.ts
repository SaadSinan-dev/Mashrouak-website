import { createContext, useContext } from "react";
import type {
  ContentKind,
  PageContent,
  PublicContent,
  PublicEntry,
  ResultContent,
  ServiceContent,
  SettingsContent,
} from "../../../shared/schema";
import { getLocalizedServices } from "../../locales/content";
import type { Language } from "../../locales/messages";
import type { Service } from "../../types/content";
export const ContentContext = createContext<{
  content: PublicContent | null;
  unavailable: boolean;
  preview: boolean;
  loading: boolean;
  retry: () => void;
}>({
  content: null,
  unavailable: false,
  preview: false,
  loading: true,
  retry: () => {},
});
export const usePlatform = () => useContext(ContentContext);
export function useEntries<T>(kind: ContentKind) {
  const { content } = usePlatform();
  return content?.entries.filter((e) => e.kind === kind) as
    PublicEntry<T>[] | undefined;
}
export function useSettings() {
  return useEntries<SettingsContent>("settings")?.find(
    (e) => e.slug === "global",
  )?.data;
}
export function usePage(slug: string) {
  return useEntries<PageContent>("pages")?.find((e) => e.slug === slug)?.data;
}
export function useServices(language: Language): Service[] {
  const entries = useEntries<ServiceContent>("services");
  if (!entries) return getLocalizedServices(language);
  return entries.map(({ slug, data }, index) => ({
    id: slug,
    number: String(index + 1).padStart(2, "0"),
    title: data.title[language],
    englishTitle: data.title.en,
    summary: data.summary[language],
    businessValue: data.businessValue[language],
    includes: data.includes.map((v) => v[language]),
    deliverables: data.deliverables.map((v) => v[language]),
    suitableFor: data.suitableFor[language],
    icon: data.icon,
  }));
}
export function useResults() {
  return useEntries<ResultContent>("results") ?? [];
}
