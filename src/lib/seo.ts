import { useEffect } from "react";
import { useLocale } from "../app/providers/preferences-context";
import { siteConfig } from "../config/site";
import {
  usePage,
  usePlatform,
  useSettings,
} from "../app/providers/content-context";

interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function useSEO({
  title,
  description,
  path = "",
  noIndex = false,
}: SeoOptions): void {
  const { language } = useLocale();
  const settings = useSettings();
  const page = usePage(path === "/" ? "home" : path.replace(/^\//, ""));
  const { preview,content } = usePlatform();
  const effectiveTitle = page?.seoTitle[language] || title;
  const effectiveDescription =
    page?.seoDescription[language] ||
    description ||
    settings?.seoDescription[language] ||
    "";
  const missingManagedPage=!!content&&!page&&['/','/services','/work','/about','/process','/contact','/results'].includes(path);
  const preventIndex = noIndex || preview || missingManagedPage;
  useEffect(() => {
    const brandName =
      settings?.companyName[language] ||
      (language === "ar" ? siteConfig.name : "Mashrouak.net");
    const pageTitle = `${effectiveTitle} | ${brandName}`;
    const canonicalUrl =
      siteConfig.url && !preventIndex ? `${siteConfig.url}${path}` : "";
    const locale = language === "ar" ? "ar_AR" : "en_US";
    document.title = pageTitle;
    upsertMeta("name", "description", effectiveDescription);
    upsertMeta(
      "name",
      "robots",
      preventIndex ? "noindex, nofollow" : "index, follow",
    );
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", effectiveDescription);
    upsertMeta("property", "og:locale", locale);
    upsertMeta(
      "property",
      "og:locale:alternate",
      language === "ar" ? "en_US" : "ar_AR",
    );
    upsertMeta("property", "og:type", "website");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", effectiveDescription);
    if (canonicalUrl) {
      upsertMeta("property", "og:url", canonicalUrl);
      upsertMeta(
        "property",
        "og:image",
        `${siteConfig.url}${siteConfig.logo.light}`,
      );
      upsertMeta(
        "property",
        "og:image:alt",
        language === "ar" ? "شعار مشروعك.net" : "Mashrouak.net logo",
      );
      upsertMeta(
        "name",
        "twitter:image",
        `${siteConfig.url}${siteConfig.logo.light}`,
      );
      upsertMeta(
        "name",
        "twitter:image:alt",
        language === "ar" ? "شعار مشروعك.net" : "Mashrouak.net logo",
      );
    } else {
      document.head.querySelector('meta[property="og:url"]')?.remove();
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    }
    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl;
    } else canonical?.remove();

    const schemaId = "mashrouak-organization-schema";
    let schema = document.getElementById(schemaId);
    if (!schema) {
      schema = document.createElement("script");
      schema.id = schemaId;
      schema.setAttribute("type", "application/ld+json");
      document.head.appendChild(schema);
    }
    const structuredData: Record<string, string> = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Mashrouak.net",
      alternateName: "مشروعك.net",
      description:
        language === "ar" ? siteConfig.description : siteConfig.descriptionEn,
    };
    if (siteConfig.url) structuredData.url = siteConfig.url;
    schema.textContent = JSON.stringify(structuredData);
  }, [
    effectiveDescription,
    language,
    preventIndex,
    path,
    effectiveTitle,
    settings,
  ]);
}
