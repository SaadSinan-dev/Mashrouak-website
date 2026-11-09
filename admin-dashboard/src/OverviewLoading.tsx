import { useState } from "react";
import { useLocale } from "./locale-context";
import { SkeletonDashboard, SkeletonRegion } from "../../shared/ui/Skeleton";
export function OverviewHeading() {
  const { t, language } = useLocale();
  const [date] = useState(() => new Date());
  return (
    <div className="admin-page-heading">
      <div>
        <span className="admin-eyebrow">MASHROUAK.NET / {t("overview")}</span>
        <h1>{t("overviewTitle")}</h1>
        <p>{t("overviewText")}</p>
      </div>
      <span className="overview-date">
        {new Intl.DateTimeFormat(language, { dateStyle: "full" }).format(date)}
      </span>
    </div>
  );
}
export function OverviewLoading() {
  const { t } = useLocale();
  return (
    <>
      <OverviewHeading />
      <SkeletonRegion label={t("loading")}>
        <SkeletonDashboard
          showHeading={false}
          metricLabels={[
            t("publishedContent"),
            t("drafts"),
            t("waiting"),
            t("activeChats"),
          ]}
        />
      </SkeletonRegion>
    </>
  );
}
