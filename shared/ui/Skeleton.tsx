import type { CSSProperties, ReactNode } from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${className}`}
      style={style}
    />
  );
}
export function SkeletonRegion({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-region ${className}`}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
export function SkeletonText({
  lines = 3,
  heading = false,
}: {
  lines?: number;
  heading?: boolean;
}) {
  return (
    <div className={`sk-text ${heading ? "sk-text--heading" : ""}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          style={{
            width: i === lines - 1 ? (heading ? "72%" : "67%") : "100%",
          }}
        />
      ))}
    </div>
  );
}
export function SkeletonImage({
  ratio = "16 / 10",
  className = "",
}: {
  ratio?: string;
  className?: string;
}) {
  return (
    <Skeleton
      className={`sk-image ${className}`}
      style={{ aspectRatio: ratio }}
    />
  );
}
export function SkeletonCard() {
  return (
    <div className="sk-card">
      <Skeleton className="sk-icon" />
      <SkeletonText heading lines={1} />
      <SkeletonText />
      <Skeleton className="sk-button" />
    </div>
  );
}
export function SkeletonProjectCard() {
  return (
    <div className="sk-project">
      <SkeletonImage ratio="1.45" />
      <div className="sk-project__body">
        <Skeleton className="sk-caption" />
        <SkeletonText heading lines={1} />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}
export function SkeletonStatCard({ label }: { label?: string }) {
  return (
    <article className="sk-stat">
      <div className="sk-stat__label">
        {label ? (
          <span className="skeleton sk-label-copy">{label}</span>
        ) : (
          <Skeleton className="sk-caption" />
        )}
        <Skeleton style={{ width: 18, height: 18 }} />
      </div>
      <strong>
        <Skeleton className="sk-stat__value" />
      </strong>
      <Skeleton className="metric-rule" />
    </article>
  );
}
export function SkeletonTable({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="sk-table">
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div
          className="sk-table__row"
          key={r}
          style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))` }}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              className={r === 0 ? "sk-caption" : "sk-table__cell"}
              key={c}
              style={{ width: `${55 + ((c + r) % 3) * 15}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
export function SkeletonChart({
  horizontal = false,
}: {
  horizontal?: boolean;
}) {
  if (horizontal)
    return (
      <div className="sk-chart sk-chart--horizontal">
        <SkeletonText heading lines={1} />
        {[70, 90, 55, 80].map((width, i) => (
          <div className="sk-chart__bar" key={i}>
            <Skeleton className="sk-caption" />
            <Skeleton style={{ height: 7, width: `${width}%` }} />
          </div>
        ))}
      </div>
    );
  return (
    <div className="sk-chart">
      <Skeleton className="sk-caption" />
      <div className="sk-chart__plot">
        {[42, 64, 51, 78, 62, 90, 74].map((height, i) => (
          <Skeleton key={i} style={{ height: `${height}%` }} />
        ))}
      </div>
      <Skeleton className="sk-caption" style={{ width: "75%" }} />
    </div>
  );
}
export function SkeletonChatMessage({
  own = false,
  index = 0,
}: {
  own?: boolean;
  index?: number;
}) {
  return (
    <div
      className={`sk-message ${own ? "sk-message--own" : ""}`}
      style={{ width: `${index % 3 === 0 ? 65 : 45}%` }}
    >
      <SkeletonText lines={index % 2 === 0 ? 2 : 1} />
      <Skeleton className="sk-message__time" />
    </div>
  );
}
export function SkeletonChatHistory() {
  return (
    <div className="sk-messages">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonChatMessage key={i} own={i % 2 === 1} index={i} />
      ))}
    </div>
  );
}
export function SkeletonForm({
  fields = 6,
  multiline = true,
}: {
  fields?: number;
  multiline?: boolean;
}) {
  const textareaIndex = multiline && fields > 2 ? fields - 2 : -1;
  return (
    <div className="sk-form">
      <SkeletonText heading lines={1} />
      {Array.from({ length: fields }, (_, i) => (
        <div className={i === textareaIndex ? "sk-form__wide" : ""} key={i}>
          <Skeleton className="sk-caption" />
          <Skeleton
            className={
              i === textareaIndex ? "sk-input sk-input--area" : "sk-input"
            }
          />
        </div>
      ))}
      <Skeleton className="sk-button" />
    </div>
  );
}
export function SkeletonNavigation() {
  return (
    <div className="sk-navigation">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i}>
          <Skeleton className="sk-icon" />
          <Skeleton className="sk-caption" />
        </div>
      ))}
    </div>
  );
}
export function SkeletonPageSection() {
  return (
    <div className="sk-section">
      <SkeletonText heading lines={2} />
      <SkeletonText lines={3} />
    </div>
  );
}
export function SkeletonDashboard({
  metricLabels = [],
  showHeading = true,
}: {
  metricLabels?: string[];
  showHeading?: boolean;
}) {
  return (
    <>
      {showHeading && (
        <div className="sk-dashboard-heading">
          <Skeleton className="sk-caption" />
          <SkeletonText heading lines={1} />
          <SkeletonText lines={1} />
        </div>
      )}
      <div className="overview-stats sk-stats">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStatCard key={i} label={metricLabels[i]} />
        ))}
      </div>
      <div className="sk-dashboard-bottom">
        <SkeletonChart horizontal />
        <div className="sk-dashboard-actions">
          <Skeleton className="sk-icon" />
          <SkeletonText heading lines={2} />
          {[0, 1, 2].map((i) => (
            <div className="sk-dashboard-action" key={i}>
              <Skeleton className="sk-caption" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
export function SkeletonEditor() {
  return (
    <div className="sk-editor">
      <div className="sk-toolbar">
        <Skeleton className="sk-button" />
        <Skeleton className="sk-button" />
      </div>
      <SkeletonForm fields={8} />
    </div>
  );
}
export function SkeletonMedia() {
  return (
    <div className="sk-grid sk-grid--media">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="sk-card" key={i}>
          <SkeletonImage />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}
export type SkeletonPageKind =
  | "home"
  | "about"
  | "portfolio"
  | "case"
  | "services"
  | "contact"
  | "chat"
  | "process"
  | "results"
  | "legal"
  | "default";
export function SkeletonPage({
  kind = "default",
  label,
}: {
  kind?: SkeletonPageKind;
  label: string;
}) {
  if (kind === "chat")
    return (
      <SkeletonRegion label={label} className="sk-chat-page">
        <div className="sk-chat-top">
          <Skeleton className="sk-icon" />
          <Skeleton className="sk-caption" />
          <Skeleton className="sk-icon" />
        </div>
        <div className="sk-chat-workspace">
          <SkeletonPageSection />
          <div className="sk-chat-window">
            <div className="sk-chat-top">
              <Skeleton className="sk-icon" />
              <SkeletonText lines={2} />
            </div>
            <SkeletonChatHistory />
            <Skeleton className="sk-input" />
          </div>
        </div>
      </SkeletonRegion>
    );
  return (
    <SkeletonRegion label={label} className={`sk-page sk-page--${kind}`}>
      <div className="sk-page__hero">
        <div className="container-shell">
          <div>
            <Skeleton className="sk-caption" />
            <SkeletonText heading lines={2} />
            <SkeletonText lines={3} />
            {kind === "home" && (
              <div className="sk-toolbar">
                <Skeleton className="sk-button" />
                <Skeleton className="sk-button" />
              </div>
            )}
          </div>
          {kind === "home" ? (
            <SkeletonImage ratio="1.05" />
          ) : (
            <div className="sk-page__aside">
              <SkeletonText lines={4} />
              <Skeleton className="sk-caption" />
            </div>
          )}
        </div>
      </div>
      <div className="container-shell sk-page__body">
        {kind === "portfolio" ? (
          <>
            <div className="sk-toolbar">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton className="sk-button" key={i} />
              ))}
            </div>
            <div className="sk-grid">
              {[0, 1, 2].map((i) => (
                <SkeletonProjectCard key={i} />
              ))}
            </div>
          </>
        ) : kind === "case" ? (
          <>
            <SkeletonImage ratio="2" />
            <div className="sk-two-col">
              <SkeletonPageSection />
              <SkeletonText lines={6} />
            </div>
          </>
        ) : kind === "contact" ? (
          <>
            <div className="sk-grid">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <div className="sk-contact-form">
              <SkeletonPageSection />
              <SkeletonForm />
            </div>
          </>
        ) : kind === "services" ? (
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
        ) : kind === "process" ? (
          <>
            {[0, 1, 2].map((i) => (
              <div className="sk-timeline" key={i}>
                <Skeleton className="sk-icon" />
                <SkeletonPageSection />
                <SkeletonText lines={4} />
              </div>
            ))}
          </>
        ) : kind === "results" ? (
          <div className="sk-two-col">
            <SkeletonCard />
            <div>
              <SkeletonTable rows={3} columns={2} />
            </div>
          </div>
        ) : kind === "legal" ? (
          <div className="sk-legal">
            {[0, 1, 2].map((i) => (
              <SkeletonPageSection key={i} />
            ))}
          </div>
        ) : kind === "home" ? (
          <>
            <SkeletonPageSection />
            <SkeletonTable rows={4} columns={3} />
          </>
        ) : (
          <div className="sk-two-col">
            <SkeletonPageSection />
            <SkeletonText lines={7} />
          </div>
        )}
      </div>
    </SkeletonRegion>
  );
}
