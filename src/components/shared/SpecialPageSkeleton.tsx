import {CmsText} from '../../features/content/Editable';
import { useLocation } from "react-router-dom";
import { useLocale } from "../../app/providers/preferences-context";
import { peekPortfolioProject } from "../../features/portfolio/usePortfolioProjects";
import {
  Skeleton,
  SkeletonImage,
  SkeletonPageSection,
  SkeletonRegion,
  SkeletonText,
} from "../../../shared/ui/Skeleton";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

function Copy({ children }: { children: ReactNode }) {
  return <span className="skeleton sk-copy">{children}</span>;
}
export function SpecialPageSkeleton({
  kind,
  label,
}: {
  kind: string;
  label: string;
}) {
  const { pathname } = useLocation();
  const { t, isArabic: ar } = useLocale();
  if (kind === "case") {
    const project = peekPortfolioProject(pathname.split("/").pop());
    return (
      <SkeletonRegion label={label} className="sk-public-page sk-page--case">
        <div className="case-hero">
          <div className="container-shell">
            <div className="breadcrumbs">
              <Copy>
                <CmsText k="case.breadcrumbHome"/> / <CmsText k="case.breadcrumbWork"/> /{" "}
                {project?.title ?? "Project"}
              </Copy>
            </div>
            <div className="case-hero__heading">
              <div>
                <p className="eyebrow">
                  <Copy>
                    {project?.category ?? t("case.label")} /{" "}
                    <CmsText k="case.label"/>
                  </Copy>
                </p>
                <h1 dir="ltr">
                  <Copy>{project?.title ?? (ar ? "المشروع" : "Project")}</Copy>
                </h1>
                <p>
                  <Copy>
                    {project?.shortDescription ?? t("case.notFoundDescription")}
                  </Copy>
                </p>
              </div>
              <div>
                <span className="case-hero__index">
                  <Copy>
                    <CmsText k="case.indexPrefix"/> / {project?.id.toUpperCase()}
                  </Copy>
                </span>
                <span className="text-link">
                  <Copy><CmsText k="case.discussSimilar"/></Copy>
                </span>
              </div>
            </div>
            <div className="case-hero__artwork">
              <SkeletonImage className="sk-case-image" />
            </div>
            <p className="case-hero__disclaimer">
              <Copy><CmsText k="case.visualDisclaimer"/></Copy>
            </p>
          </div>
        </div>
        <div className="container-shell section-space sk-two-col">
          <SkeletonPageSection />
          <SkeletonText lines={6} />
        </div>
      </SkeletonRegion>
    );
  }
  if (kind === "legal")
    return (
      <SkeletonRegion label={label} className="sk-public-page sk-page--legal">
        <div className="privacy-page legal-page section-space">
          <div className="container-shell">
            <p className="eyebrow">
              <Copy>
                {pathname === "/privacy"
                  ? t("privacy.eyebrow")
                  : ar
                    ? "المعلومات القانونية / 01"
                    : "Legal information / 01"}
              </Copy>
            </p>
            <h1>
              <Copy>
                {pathname === "/privacy"
                  ? t("privacy.title")
                  : ar
                    ? "الشروط والأحكام"
                    : "Terms and Conditions"}
              </Copy>
            </h1>
            <div className="privacy-page__lead">
              <SkeletonText lines={3} />
            </div>
            <div className="privacy-page__body legal-page__sections">
              {[0, 1, 2, 3].map((i) => (
                <div className="legal-section" key={i}>
                  <Skeleton className="sk-caption" style={{ width: 20 }} />
                  <div>
                    <SkeletonText heading lines={1} />
                    <SkeletonText lines={4} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SkeletonRegion>
    );
  if (kind === "results")
    return (
      <SkeletonRegion label={label} className="sk-public-page sk-page--results">
        <div className="results-section section-space">
          <div className="container-shell">
            <div className="results-heading">
              <div>
                <p className="eyebrow">
                  <Copy>
                    {ar
                      ? "نتائجنا / أثر يمكن التحقق منه"
                      : "OUR RESULTS / EVIDENCE FIRST"}
                  </Copy>
                </p>
                <h1>
                  <Copy>{ar ? "أثر واضح،" : "Clear impact,"}</Copy>
                  <br />
                  <span>
                    <Copy>{ar ? "تدعمه الأدلة" : "backed by evidence"}</Copy>
                  </span>
                </h1>
              </div>
              <p>
                <Copy>
                  {ar
                    ? "نربط التقنية بهدف عمل واضح، ونوثّق ما تغيّر وكيف قِيس. لا ننشر نسب نمو أو إنجازات عملاء دون أدلة معتمدة."
                    : "We connect technology to a clear business objective, documenting what changed and how it was measured. Client achievements are published only with approved evidence."}
                </Copy>
              </p>
            </div>
            <div className="sk-results-layout">
              <div>
                <Skeleton className="sk-caption" />
                <SkeletonText heading lines={1} />
                <SkeletonText lines={4} />
              </div>
              <div>
                {[0, 1, 2].map((i) => (
                  <div className="sk-timeline" key={i}>
                    <Skeleton className="sk-icon" />
                    <SkeletonText lines={3} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SkeletonRegion>
    );
  return (
    <SkeletonRegion label={label} className="sk-public-page sk-page--about">
      <div className="page-hero page-hero--light about-hero">
        <div className="container-shell page-hero__layout">
          <div>
            <p className="eyebrow">
              <Copy><CmsText k="about.eyebrow"/></Copy>
            </p>
            <h1>
              <Copy><CmsText k="about.title"/></Copy>{" "}
              <span className="about-hero__brand">
                <Logo width={ar ? 246 : 228} />
              </span>
              <br />
              <span>
                <Copy><CmsText k="about.emphasis"/></Copy>
              </span>
            </h1>
          </div>
          <div className="page-hero__aside">
            <p>
              <Copy><CmsText k="about.description"/></Copy>
            </p>
            <span>
              <Copy><CmsText k="about.studioType"/></Copy>
            </span>
            <a className="text-link" tabIndex={-1}>
              <Copy><CmsText k="about.link"/></Copy>
              <Skeleton style={{width:17,height:17}}/>
            </a>
          </div>
        </div>
      </div>
      <div className="container-shell section-space sk-two-col">
        <SkeletonPageSection />
        <SkeletonText lines={7} />
      </div>
    </SkeletonRegion>
  );
}
