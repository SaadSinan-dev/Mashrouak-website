import {
  ArrowUpLeft,
  ArrowUpRight,
  FileText,
  MessageSquare,
  Layers3,
  PencilLine,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "../../shared/schema";
import { useLocale, type CopyKey } from "./locale-context";
import { useResource } from "./useResource";
import { OverviewHeading, OverviewLoading } from "./OverviewLoading";
import { ResourceError } from "../../shared/ui/ResourceError";
export function Overview({ user }: { user: User }) {
  const { t, language, ar } = useLocale();
  const { data, error, loading, retry } = useResource<{
    counts: Record<string, number>;
    content: { kind: CopyKey; total: number; published: number }[];
  }>("/admin/overview", 30000);
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  if (loading) return <OverviewLoading />;
  if (error && !data)
    return (
      <>
        <OverviewHeading />
        <ResourceError language={language} onRetry={retry} />
      </>
    );
  const metrics = [
    ["published", "publishedContent", Layers3],
    ["drafts", "drafts", PencilLine],
    ["pending", "waiting", MessageSquare],
    ["active", "activeChats", FileText],
  ] as const;
  return (
    <div className="content-enter">
      <OverviewHeading />
      <div className="overview-stats">
        {metrics.map(([key, label, Icon]) => (
          <article key={key}>
            <div>
              <span>{t(label)}</span>
              <Icon size={18} />
            </div>
            <strong>
              {new Intl.NumberFormat(language).format(data?.counts[key] ?? 0)}
            </strong>
            <span className="metric-rule" />
          </article>
        ))}
      </div>
      <div className="overview-panels">
        {user.role !== "support" && (
          <section className="admin-panel">
            <h2>{t("contentHealth")}</h2>
            <div className="overview-content-chart">
              {data?.content.map((row) => (
                <div key={row.kind}>
                  <div>
                    <span>{t(row.kind)}</span>
                    <span>
                      {row.published} / {row.total} {t("published")}
                    </span>
                  </div>
                  <i>
                    <b
                      style={{
                        width: `${row.total ? (row.published / row.total) * 100 : 0}%`,
                      }}
                    />
                  </i>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="admin-panel overview-actions">
          <img src="/brand/symbol-colour.svg" alt="" width="45" height="45" />
          <h2>{t("welcome")}</h2>
          {user.role !== "support" && (
            <Link to="/content/pages">
              {t("quickContent")}
              <Arrow size={19} />
            </Link>
          )}
          {user.role !== "editor" && (
            <Link to="/inbox">
              {t("quickSupport")}
              <Arrow size={19} />
            </Link>
          )}
          <a
            href={import.meta.env.VITE_PUBLIC_URL ?? "http://localhost:5173"}
            target="_blank"
            rel="noreferrer"
          >
            {t("website")}
            <Arrow size={19} />
          </a>
        </section>
      </div>
    </div>
  );
}
