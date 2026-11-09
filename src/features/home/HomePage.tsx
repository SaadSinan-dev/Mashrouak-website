import { useLocale } from "../../app/providers/preferences-context";
import { useSEO } from "../../lib/seo";
import { CTASection } from "../../components/shared/CTASection";
import { ChallengesSection } from "./sections/ChallengesSection";
import { FAQSection } from "./sections/FAQSection";
import { HeroSection } from "./sections/HeroSection";
import { ProcessPreviewSection } from "./sections/ProcessPreviewSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { ServicesSection } from "./sections/ServicesSection";
import { WhySection } from "./sections/WhySection";
import { ResultsSection } from "../results/ResultsSection";
import { CMSPage } from "../content/CMSPage";

export function HomePage() {
  const { t } = useLocale();
  useSEO({
    title: t("hero.title"),
    description: t("hero.description"),
    path: "/",
  });
  return (
    <CMSPage slug="home">
      <HeroSection />
      <ChallengesSection />
      <ServicesSection />
      <ProjectsSection />
      <ResultsSection />
      <WhySection />
      <ProcessPreviewSection />
      <FAQSection />
      <CTASection />
    </CMSPage>
  );
}
