import {CmsText} from '../../features/content/Editable';
import { useLocale } from "../../app/providers/preferences-context";
import { getLocalizedProjectCategories } from "../../locales/content";
import {
  Skeleton,
  SkeletonForm,
  SkeletonImage,
  SkeletonPage,
  SkeletonPageSection,
  SkeletonRegion,
  SkeletonText,
  type SkeletonPageKind,
} from "../../../shared/ui/Skeleton";
import type { TranslationKey } from "../../locales/messages";
import type { ReactNode } from "react";
import { SpecialPageSkeleton } from "./SpecialPageSkeleton";
import { ProductSceneSkeleton } from "./ProductSceneSkeleton";
import { HeroHorizon } from "../../features/home/sections/HeroHorizon";

// The real typography and layout classes reserve each page's geometry.
function Copy({ children }: { children: ReactNode }) {
  return <span className="skeleton sk-copy">{children}</span>;
}
const titles: Partial<
  Record<
    SkeletonPageKind,
    [
      TranslationKey,
      TranslationKey,
      TranslationKey,
      TranslationKey,
      TranslationKey,
    ]
  >
> = {
  portfolio: [
    "projects.pageEyebrow",
    "projects.pageTitle",
    "projects.pageEmphasis",
    "projects.pageDescription",
    "projects.countLabel",
  ],
  services: [
    "service.heroEyebrow",
    "service.heroTitle",
    "service.heroEmphasis",
    "service.heroDescription",
    "service.pageMeta",
  ],
  contact: [
    "contact.eyebrow",
    "contact.title",
    "contact.emphasis",
    "contact.description",
    "contact.heroMeta",
  ],
  process: [
    "process.pageEyebrow",
    "process.pageTitle",
    "process.pageEmphasis",
    "process.pageDescription",
    "process.stages",
  ],
};
export function PublicPageSkeleton({
  kind,
  label,
}: {
  kind: SkeletonPageKind;
  label: string;
}) {
  const { t, language, isArabic: ar } = useLocale();
  if (kind === "home")
    return (
      <SkeletonRegion label={label} className="sk-public-page sk-page--home">
        <div className="hero-section hero-section--horizon">
          <HeroHorizon />
          <div className="container-shell hero-section__layout">
            <div className="hero-section__copy">
              <p className="hero-kicker">
                <Copy><CmsText k="hero.eyebrow"/></Copy>
              </p>
              <h1>
                <Copy>
                  <CmsText k="hero.title"/> <em><CmsText k="hero.emphasis"/></em>
                </Copy>
              </h1>
              <p className="hero-section__description">
                <Copy><CmsText k="hero.description"/></Copy>
              </p>
              <div className="hero-section__actions">
                <span className="button button--lg sk-action-button">
                  <Copy><CmsText k={"common.discuss"}/></Copy>
                  <Skeleton style={{ width: 18, height: 18 }} />
                </span>
                <span className="hero-section__secondary">
                  <Copy><CmsText k={"common.exploreWork"}/></Copy>
                  <Skeleton style={{ width: 17, height: 17 }} />
                </span>
              </div>
            </div>
            <div className="hero-exhibit">
              <div className="hero-section__footnote">
                <span dir="ltr">
                  <Copy>FIG. 01</Copy>
                </span>
                <span>
                  <Copy><CmsText k="hero.footnote"/></Copy>
                </span>
              </div>
              <div className="hero-visual sk-product-visual">
                <ProductSceneSkeleton />
              </div>
            </div>
          </div>
          <div className="hero-section__bottomline">
            <div className="container-shell">
              <Skeleton className="sk-caption" />
              <Skeleton className="sk-caption" />
              <Skeleton className="sk-caption" />
            </div>
          </div>
        </div>
        <div className="container-shell section-space">
          <SkeletonPageSection />
          <div className="sk-timeline">
            <Skeleton className="sk-icon" />
            <SkeletonText />
            <SkeletonText />
          </div>
        </div>
      </SkeletonRegion>
    );
  const title = titles[kind];
  if (["case", "legal", "results", "about"].includes(kind))
    return <SpecialPageSkeleton kind={kind} label={label} />;
  if (!title) return <SkeletonPage kind={kind} label={label} />;
  const dark = kind === "portfolio" || kind === "process";
  return (
    <SkeletonRegion label={label} className={`sk-public-page sk-page--${kind}`}>
      <div
        className={`page-hero page-hero--${dark ? "dark" : "light"} ${kind === "contact" ? "contact-hero" : ""}`}
      >
        <div className="container-shell page-hero__layout">
          <div>
            <p className={`eyebrow ${dark ? "eyebrow--light" : ""}`}>
              <Copy>{t(title[0])}</Copy>
            </p>
            <h1>
              <Copy>{t(title[1])}</Copy>
              <br />
              <span>
                <Copy>{t(title[2])}</Copy>
              </span>
            </h1>
          </div>
          <div>
            <div className="page-hero__aside">
              <p>
                <Copy>{t(title[3])}</Copy>
              </p>
              {kind === "services" && (
                <div className="text-link">
                  <Skeleton className="sk-caption" />
                </div>
              )}
              <span>
                <Copy>{t(title[4])}</Copy>
              </span>
              {kind === "portfolio" && (
                <Skeleton
                  className="sk-icon"
                  style={{ width: 22, height: 22, marginTop: 20 }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {kind === "portfolio" ? (
        <div className="portfolio-page section-space">
          <div className="container-shell">
            <div className="portfolio-toolbar">
              <p>
                <Copy>{t("projects.filterIntro")}</Copy>
              </p>
              <div className="portfolio-filters">
                {getLocalizedProjectCategories(language).map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    disabled
                    tabIndex={-1}
                  >
                    <Copy>{category.label}</Copy>
                  </button>
                ))}
              </div>
            </div>
            <div className="portfolio-grid">
              {[0, 1, 2].map((i) => (
                <div className="project-card" key={i}>
                  <SkeletonImage className="sk-portfolio-image" />
                  <div className="project-card__body">
                    <div className="project-card__meta">
                      <Skeleton className="sk-caption" />
                      <Skeleton className="sk-caption" />
                    </div>
                    <SkeletonText heading lines={1} />
                    <Skeleton className="sk-caption" style={{ width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : kind === "contact" ? (
        <>
          <div className="contact-channels">
            <div className="container-shell">
              {[0, 1, 2].map((i) => (
                <a key={i} tabIndex={-1}>
                  <span>
                    <Skeleton className="sk-caption" />
                  </span>
                  <Skeleton className="sk-icon" />
                  <h2>
                    <Copy>
                      {ar
                        ? [
                            "أرسل التفاصيل",
                            "ابدأ الحديث",
                            "هنا، في مساحة خاصة",
                          ][i]
                        : [
                            "Put it in writing",
                            "Start a conversation",
                            "Here, in a private space",
                          ][i]}
                    </Copy>
                  </h2>
                  <p>
                    <Skeleton className="sk-caption" style={{ width: "80%" }} />
                  </p>
                  <strong>
                    <Skeleton className="sk-caption" />
                  </strong>
                  <Skeleton className="sk-caption" style={{ width: 18 }} />
                </a>
              ))}
            </div>
          </div>
          <div className="contact-page section-space">
            <div className="container-shell contact-page__layout">
              <SkeletonPageSection />
              <SkeletonForm fields={8} />
            </div>
          </div>
        </>
      ) : (
        <div className="container-shell section-space">
          <SkeletonPageSection />
          {kind === "services" ? (
            <>
              {[0, 1].map((i) => (
                <div className="sk-service" key={i}>
                  <SkeletonImage ratio="1.15" />
                  <div>
                    <SkeletonPageSection />
                    <div className="sk-two-col">
                      <SkeletonText lines={4} />
                      <SkeletonText lines={4} />
                    </div>
                    <Skeleton className="sk-button" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {[0, 1, 2].map((i) => (
                <div className="sk-timeline" key={i}>
                  <Skeleton className="sk-icon" />
                  <SkeletonPageSection />
                  <SkeletonText lines={4} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </SkeletonRegion>
  );
}
