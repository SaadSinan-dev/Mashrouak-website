import type { PortfolioProject } from "../portfolio/project-feed";
import type { ResultContent } from "../../../shared/schema";

export const areas = {
  product: { en: "Product workflows", ar: "مسارات الاستخدام" },
  interface: { en: "Interface & access", ar: "الواجهة وإمكانية الوصول" },
  platform: { en: "Platform & data", ar: "المنصة والبيانات" },
  delivery: { en: "Quality & delivery", ar: "الجودة والتسليم" },
};
type Area = keyof typeof areas;

function classify(text: string): Area {
  if (
    /\b(tests?|testing|retry|failure|quality|fallback|lazy.loaded|frame.loop|performance|validation|validated|اختبار|اختبارات)\b/i.test(
      text,
    )
  )
    return "delivery";
  if (
    /\b(database|server|storage|rpcs?|api|otp|policies|supabase|firebase|postgis|auth\w*|sessions?|sync|offline|security|backend|row-locked|ledger|edge function)\b/i.test(
      text,
    )
  )
    return "platform";
  if (
    /\b(rtl|keyboard|theme\w*|accessible|accessibility|navigation|responsive|motion|layout\w*|3d|rendering|locali[sz]ation|bilingual)\b/i.test(
      text,
    )
  )
    return "interface";
  return "product";
}

export function deliveryMap(project: PortfolioProject, language: "ar" | "en") {
  const groups = new Map<Area, string[]>();
  const seen = new Set<string>();
  const aligned = project.featuresAr.length === project.features.length;
  const source = project.features.length
    ? project.features
    : project.featuresAr;
  source.forEach((raw, index) => {
    const original = raw.trim();
    if (!original || seen.has(original)) return;
    seen.add(original);
    const area = classify(original);
    const localized =
      language === "ar" && aligned ? project.featuresAr[index]?.trim() : "";
    const items = groups.get(area) ?? [];
    items.push(localized || original);
    groups.set(area, items);
  });
  return [...groups].sort((left, right) => right[1].length - left[1].length);
}

export const metricCategories = {
  engineering: { en: "Engineering", ar: "الهندسة" },
  performance: { en: "Performance", ar: "الأداء" },
  experience: { en: "Product experience", ar: "تجربة المنتج" },
};
export const statusLabels = {
  verified: { en: "Verified measurement", ar: "قياس موثّق" },
  achievement: { en: "Technical achievement", ar: "إنجاز تقني" },
  demonstration: { en: "Illustrative data", ar: "بيانات توضيحية" },
  draft: { en: "Unverified draft", ar: "مسودة غير موثّقة" },
};
export { publicMetric } from "../../../shared/schema";
export function comparison(data: ResultContent) {
  if (data.display !== "comparison" || !data.comparable || data.before == null)
    return null;
  const min = Math.min(0, data.before, data.after),
    max = Math.max(0, data.before, data.after);
  const scale = (value: number) => 100 * ((value - min) / (max - min || 1));
  return {
    delta: data.after - data.before,
    zero: scale(0),
    before: scale(data.before),
    after: scale(data.after),
  };
}
export function timeline(data: ResultContent) {
  if (
    data.display !== "history" ||
    !data.comparable ||
    !data.measuredOn ||
    !data.observations?.length
  )
    return [];
  const earlier = [...data.observations].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  if (
    earlier.some(
      (point, index) =>
        point.date >= data.measuredOn! ||
        earlier[index - 1]?.date === point.date,
    )
  )
    return [];
  return [...earlier, { date: data.measuredOn, value: data.after }];
}
