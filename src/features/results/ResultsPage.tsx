import { useLocale } from "../../app/providers/preferences-context";
import { useSEO } from "../../lib/seo";
import { ResultsSection } from "./ResultsSection";
import { CTASection } from "../../components/shared/CTASection";
import { CMSPage } from '../content/CMSPage';
export function ResultsPage() {
  const { isArabic } = useLocale();
  useSEO({
    title: isArabic ? "نتائجنا" : "Our Results",
    description: isArabic
      ? "نتائج موثّقة ومنهجية قياس أثر المنتجات الرقمية"
      : "Evidence-backed results and our approach to measuring digital product impact",
    path: "/results",
  });
  return (
    <CMSPage slug="results">
      <ResultsSection full />
      <CTASection />
    </CMSPage>
  );
}
