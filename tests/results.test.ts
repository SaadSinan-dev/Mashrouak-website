import { describe, expect, it } from "vitest";
import {
  publicMetric,
  resultSchema,
  validatePublication,
  type ResultContent,
} from "../shared/schema";
import {
  comparison,
  deliveryMap,
  timeline,
} from "../src/features/results/evidence";
import { normalizeFeed } from "../src/features/portfolio/project-feed";
import { recordHighlight } from "../src/features/results/record-highlight";

const text = { en: "Evidence", ar: "أدلة" };
const base: ResultContent = {
  title: text,
  description: text,
  before: 2,
  after: 1,
  unit: text,
  period: text,
  projectSlug: "sample",
  methodology: text,
  evidence: [{ label: text, url: "/report" }],
  verification: "verified",
  approvedBy: "Reviewer",
};
describe("project evidence", () => {
  it("reads legacy entries without assuming comparable baselines", () => {
    expect(resultSchema.parse(base)).toEqual(base);
    expect(comparison(base)).toBeNull();
  });
  it("requires approved bilingual evidence and comparable conditions", () => {
    expect(
      validatePublication("results", {
        ...base,
        verification: "achievement",
        methodology: { ar: "", en: "Method" },
      }),
    ).toBeTruthy();
    expect(
      validatePublication("results", { ...base, display: "comparison" }),
    ).toBeTruthy();
    expect(
      validatePublication("results", {
        ...base,
        display: "comparison",
        comparable: true,
        before: null,
      }),
    ).toBeTruthy();
    expect(
      validatePublication("results", {
        ...base,
        display: "comparison",
        comparable: true,
      }),
    ).toBeNull();
  });
  it("scales around zero and preserves negative and zero values", () => {
    const metric = {
      ...base,
      display: "comparison" as const,
      comparable: true,
    };
    expect(comparison({ ...metric, before: -4, after: 4 })).toEqual({
      delta: 8,
      zero: 50,
      before: 0,
      after: 100,
    });
    expect(comparison({ ...metric, before: 0, after: 0 })).toEqual({
      delta: 0,
      zero: 0,
      before: 0,
      after: 0,
    });
  });
  it("orders actual dates and rejects ambiguous or impossible dates", () => {
    const metric: ResultContent = {
      ...base,
      display: "history",
      comparable: true,
      measuredOn: "2026-03-01",
      observations: [
        { date: "2026-02-01", value: 0 },
        { date: "2026-01-01", value: 2 },
      ],
    };
    expect(timeline(metric).map((point) => point.value)).toEqual([2, 0, 1]);
    expect(validatePublication("results", metric)).toBeNull();
    expect(
      validatePublication("results", { ...metric, measuredOn: "2026-02-01" }),
    ).toBeTruthy();
    expect(
      timeline({
        ...metric,
        observations: [metric.observations![0]!, metric.observations![0]!],
      }),
    ).toEqual([]);
    expect(
      resultSchema.safeParse({ ...metric, measuredOn: "2026-02-31" }).success,
    ).toBe(false);
  });
  it("never treats illustrative, hidden, or draft metrics as public", () => {
    for (const verification of ["draft", "demonstration"] as const)
      expect(publicMetric({ ...base, verification })).toBe(false);
    expect(publicMetric({ ...base, metricVisible: false })).toBe(false);
    expect(publicMetric(base)).toBe(true);
  });
  it("derives a bilingual ledger without counting translations twice", () => {
    const [project] = normalizeFeed({
      version: 1,
      projects: [
        {
          id: "sample",
          title: "Sample",
          category: "web",
          features: [
            "Phone authentication",
            "Five preset camera views",
            "Phone authentication",
          ],
          featuresAr: ["هوية الهاتف", "زوايا التصوير", "هوية الهاتف"],
        },
      ],
    });
    expect(deliveryMap(project!, "ar")).toEqual([
      ["platform", ["هوية الهاتف"]],
      ["product", ["زوايا التصوير"]],
    ]);
    expect(recordHighlight(project!)?.value).toBe(5);
    expect(recordHighlight({ ...project!, features: [] })).toBeNull();
  });
});
