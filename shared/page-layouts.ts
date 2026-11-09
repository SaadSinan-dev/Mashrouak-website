// Stable slots preserve the original page components while allowing editorial ordering.
export const pageLayouts: Record<string, readonly string[]> = {
  home: [
    "hero",
    "challenges",
    "services",
    "projects",
    "results",
    "why",
    "process",
    "faq",
    "cta",
  ],
  about: ["hero", "statement", "values", "commitment", "cta"],
  services: ["hero", "services", "fit", "cta"],
  process: ["hero", "process", "collaboration", "cta"],
  contact: ["hero", "channels", "contact", "cta"],
  work: ["hero", "projects", "cta"],
  results: ["results", "cta"],
};
