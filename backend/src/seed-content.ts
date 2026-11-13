import { getLocalizedServices } from "../../src/locales/content";
import { messages } from "../../src/locales/messages";
import { pageLayouts } from "../../shared/page-layouts";
import {
  contentSchemas,
  type ContentData,
  type ContentKind,
  type SettingsContent,
} from "../../shared/schema";

export const seedEntries: {
  kind: ContentKind;
  slug: string;
  data: ContentData;
  order: number;
}[] = [];
function entry(
  kind: ContentKind,
  slug: string,
  data: ContentData,
  order: number,
) {
  contentSchemas[kind].parse(data);
  seedEntries.push({ kind, slug, data, order });
}
const bi = (ar: string, en: string) => ({ ar, en });
const arServices = getLocalizedServices("ar");
for (const [index, en] of getLocalizedServices("en").entries()) {
  const ar = arServices[index]!;
  entry(
    "services",
    ar.id,
    {
      title: bi(ar.title, en.title),
      summary: bi(ar.summary, en.summary),
      businessValue: bi(ar.businessValue, en.businessValue),
      includes: ar.includes.map((v, i) => bi(v, en.includes[i] ?? "")),
      deliverables: ar.deliverables.map((v, i) =>
        bi(v, en.deliverables[i] ?? ""),
      ),
      suitableFor: bi(ar.suitableFor, en.suitableFor),
      icon: ar.icon,
    },
    index,
  );
}
const nav = [
  ["الرئيسية", "Home", "/"],
  ["خدماتنا", "Services", "/services"],
  ["أعمالنا", "Work", "/work"],
  ["نتائجنا", "Our Results", "/results"],
  ["من نحن", "About", "/about"],
  ["رحلة العمل", "Process", "/process"],
  ["تواصل معنا", "Contact", "/contact"],
];
const settings: SettingsContent = {
  companyName: bi("مشروعك.net", "Mashrouak.net"),
  description: bi(
    messages.ar["hero.description"],
    messages.en["hero.description"],
  ),
  footerText: bi(
    messages.ar["footer.description"],
    messages.en["footer.description"],
  ),
  email: "mashrouak.net@gmail.com",
  whatsapp: "963937254833",
  instagram: "https://www.instagram.com/mashrouak_net/",
  navigation: nav.map(([ar, en, to]) => ({ label: bi(ar!, en!), to: to! })),
  ctaLabel: bi(messages.ar["common.discuss"], messages.en["common.discuss"]),
  ctaUrl: "/contact",
  seoTitle: bi("مشروعك.net", "Mashrouak.net"),
  seoDescription: bi(
    messages.ar["hero.description"],
    messages.en["hero.description"],
  ),
  logoArLight: "/brand/logo-horizontal-colour.svg",
  logoArDark: "/brand/logo-horizontal-ivory.svg",
  logoEnLight: "/brand/logo-horizontal-en-colour.png",
  logoEnDark: "/brand/logo-horizontal-en-ivory.png",
  defaultLanguage: "ar",
  defaultTheme: "light",
  chatEnabled: true,
  aiEnabled: false,
  translations: { ar: { ...messages.ar }, en: { ...messages.en } },
};
entry("settings", "global", settings, 0);
const sectionNames = [
  "hero",
  "challenges",
  "services",
  "projects",
  "results",
  "why",
  "process",
  "faq",
  "cta",
] as const;
entry(
  "pages",
  "home",
  {
    title: bi(messages.ar["hero.title"], messages.en["hero.title"]),
    description: bi(
      messages.ar["hero.description"],
      messages.en["hero.description"],
    ),
    seoTitle: bi(messages.ar["hero.title"], messages.en["hero.title"]),
    seoDescription: bi(
      messages.ar["hero.description"],
      messages.en["hero.description"],
    ),
    sections: sectionNames.map((kind) => ({
      id: kind,
      kind,
      visible: true,
      background: "default" as const,
      title: bi("", ""),
      body: bi("", ""),
      image: null,
      buttonLabel: bi("", ""),
      buttonUrl: "",
    })),
  },
  0,
);
for (const slug of [
  "about",
  "services",
  "process",
  "contact",
  "work",
  "results",
]) {
  const label = nav.find((n) => n[2] === `/${slug}`)!;
  entry(
    "pages",
    slug,
    {
      title: bi(label[0]!, label[1]!),
      description: bi("", ""),
      seoTitle: bi(label[0]!, label[1]!),
      seoDescription: bi("", ""),
      sections: (pageLayouts[slug] ?? []).map((id) => ({
        id,
        kind: "hero" as const,
        visible: true,
        background: "default" as const,
        title: bi("", ""),
        body: bi("", ""),
        image: null,
        buttonLabel: bi("", ""),
        buttonUrl: "",
      })),
    },
    1,
  );
}

export async function seedPostgres(
  database: import("./database").Database,
  channel = "mashrouak_publication",
) {
  const records = seedEntries.map((item) => ({
    id: crypto.randomUUID(),
    kind: item.kind,
    slug: item.slug,
    sort_order: item.order,
    draft: JSON.stringify(item.data),
  }));
  return database
    .prepare(
      "WITH inserted AS (INSERT INTO content(id,kind,slug,sort_order,status,draft,published,published_slug,published_sort_order,updated_at) SELECT id,kind,slug,sort_order,'published',draft,draft,slug,sort_order,now() FROM jsonb_to_recordset(?::jsonb) AS source(id TEXT,kind TEXT,slug TEXT,sort_order INTEGER,draft TEXT) ON CONFLICT(kind,slug) DO NOTHING RETURNING id), publication AS (UPDATE publication_state SET revision=revision+1,updated_at=now() WHERE id=1 AND EXISTS(SELECT 1 FROM inserted) RETURNING revision) SELECT (SELECT count(*) FROM inserted) AS inserted_count,(SELECT pg_notify(?,revision::text) FROM publication) AS notification",
    )
    .bind(JSON.stringify(records), channel)
    .first<{ inserted_count: number }>();
}
