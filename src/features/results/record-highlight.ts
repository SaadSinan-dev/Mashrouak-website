import type { PortfolioProject } from "../portfolio/project-feed";

const units: [RegExp, string, string][] = [
  [
    /([\d,]+) passing unit and widget tests/i,
    "passing tests reported",
    "اختبارًا ناجحًا بحسب سجل المشروع",
  ],
  [/\b(\w+)-chapter scroll/i, "narrative chapters", "فصول للسرد التفاعلي"],
  [
    /\b(\w+)-step demo appointment/i,
    "steps in the demo booking flow",
    "خطوات في تجربة الحجز التوضيحية",
  ],
  [/\b(\w+)-step onboarding/i, "onboarding steps", "خطوات لبدء الاستخدام"],
  [
    /\b(\w+) preset camera views/i,
    "preset camera views",
    "زوايا تصوير معدّة مسبقًا",
  ],
  [
    /\b(\w+)-stage 3D coffee/i,
    "stages in the 3D journey",
    "مراحل في الرحلة ثلاثية الأبعاد",
  ],
  [/\b(\w+)-section editorial/i, "editorial sections", "أقسام تحريرية"],
];
const words: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
export function recordHighlight(project: PortfolioProject) {
  const record = [project.description, ...project.features].join("\n");
  for (const [pattern, en, ar] of units) {
    const match = pattern.exec(record);
    if (!match?.[1]) continue;
    const value =
      words[match[1].toLowerCase()] ?? Number(match[1].replaceAll(",", ""));
    if (Number.isSafeInteger(value)) return { value, label: { en, ar } };
  }
  return null;
}
type Signature = {
  source: string;
  label: [string, string];
  parts: [string, string][];
};
const signatures: Signature[] = [
  {
    source: "Classic, Modern, and Editorial layouts",
    label: ["Menu layouts", "تخطيطات القائمة"],
    parts: [
      ["Classic", "كلاسيكي"],
      ["Modern", "عصري"],
      ["Editorial", "تحريري"],
    ],
  },
  {
    source: "List, Kanban board, calendar and timeline views",
    label: ["Views sharing one task model", "واجهات لنموذج مهام واحد"],
    parts: [
      ["List", "قائمة"],
      ["Board", "لوحة"],
      ["Calendar", "تقويم"],
      ["Timeline", "خط زمني"],
    ],
  },
  {
    source: "Typed assessment submission with results, review and history",
    label: ["Assessment workflow", "مسار التقييم"],
    parts: [
      ["Submission", "تسليم"],
      ["Results", "نتائج"],
      ["Review", "مراجعة"],
      ["History", "سجل"],
    ],
  },
  {
    source: "drawer on phones, rail on tablets",
    label: ["Adaptive navigation", "تنقّل متكيّف"],
    parts: [
      ["Phone drawer", "قائمة للهاتف"],
      ["Tablet rail", "شريط للجهاز اللوحي"],
    ],
  },
  {
    source: "Simulated sent → delivered → read receipts",
    label: ["Simulated message receipts", "محاكاة حالات الرسالة"],
    parts: [
      ["Sent", "أُرسلت"],
      ["Delivered", "وصلت"],
      ["Read", "قُرئت"],
    ],
  },
  {
    source:
      "Product search, category and price filters, availability filtering",
    label: ["Storefront discovery", "استكشاف المنتجات"],
    parts: [
      ["Search", "بحث"],
      ["Category", "فئة"],
      ["Price", "سعر"],
      ["Availability", "توفر"],
    ],
  },
];
export function designSignature(project: PortfolioProject) {
  return signatures.find((item) =>
    project.features.some((feature) => feature.includes(item.source)),
  );
}
