import { useLocation } from "react-router-dom";
import { useLocale, type CopyKey } from "./locale-context";
import {
  Skeleton,
  SkeletonForm,
  SkeletonMedia,
  SkeletonRegion,
  SkeletonTable,
  SkeletonText,
} from "../../shared/ui/Skeleton";
import { OverviewLoading } from "./OverviewLoading";
export function ModuleSkeleton() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  if (pathname === "/") return <OverviewLoading />;
  const kind = pathname.startsWith("/content/")
    ? pathname.split("/").pop()
    : pathname === "/settings"
      ? "settings"
      : pathname.slice(1);
  const title = t(kind as CopyKey) || t("dashboard");
  return (
    <SkeletonRegion label={t("loading")}>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t("content")}</span>
          <h1>{title}</h1>
          <p>
            {t(
              pathname === "/inbox"
                ? "inboxNote"
                : pathname === "/media"
                  ? "replaceNote"
                  : "draftIsolation",
            )}
          </p>
        </div>
        {pathname.startsWith("/content") && <Skeleton className="sk-button" />}
      </div>
      {pathname.startsWith("/content") || pathname === "/settings" ? (
        <>
          <div className="admin-toolbar">
            <Skeleton className="sk-input" style={{ maxWidth: 380 }} />
            <Skeleton className="sk-caption" />
          </div>
          <SkeletonTable rows={6} columns={5} />
        </>
      ) : pathname === "/media" ? (
        <>
          <div className="media-upload-form">
            {(["file", "altAr", "altEn", "visibility"] as const).map(
              (label) => (
                <label key={label}>
                  {t(label)}
                  <Skeleton className="sk-input" />
                </label>
              ),
            )}
            <Skeleton className="sk-button" />
          </div>
          <SkeletonMedia />
        </>
      ) : pathname === "/inbox" ? (
        <div className="inbox-layout">
          <aside className="inbox-list">
            <div className="admin-search">
              <Skeleton className="sk-input" />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div className="inbox-list-skeleton" key={i}>
                <SkeletonText lines={3} />
              </div>
            ))}
          </aside>
          <section className="inbox-detail">
            <div className="admin-empty inbox-select">
              {t("selectConversation")}
            </div>
          </section>
        </div>
      ) : pathname === "/account" ? (
        <SkeletonForm fields={2} multiline={false} />
      ) : (
        <SkeletonTable rows={6} columns={5} />
      )}
    </SkeletonRegion>
  );
}
