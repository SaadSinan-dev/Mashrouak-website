import { HistoryPlot } from "./HistoryPlot";
import { useLocale } from "../../app/providers/preferences-context";
import { CmsValue } from "../content/Editable";
import { mediaUrl } from "../../lib/platform-api";
import type { PublicEntry, ResultContent } from "../../../shared/schema";
import {
  comparison,
  timeline,
  metricCategories,
  statusLabels,
} from "./evidence";

export default function MetricReadout({
  entry,
}: {
  entry: PublicEntry<ResultContent>;
}) {
  const { language, isArabic } = useLocale();
  const { id, data } = entry,
    format = new Intl.NumberFormat(language, { maximumSignificantDigits: 15 })
      .format;
  const field = (
    name: "unit" | "title" | "description" | "period" | "methodology",
  ) => (
    <CmsValue entryId={id} path={[name]}>
      {data[name][language]}
    </CmsValue>
  );
  const pair = comparison(data),
    series = timeline(data);
  const change = pair
    ? `${pair.delta > 0 ? "+" : ""}${format(pair.delta)}`
    : "";
  return (
    <article className="metric-readout">
      <div className="folio">
        <span>
          {metricCategories[data.metricCategory ?? "engineering"][language]}
        </span>
        <span>{statusLabels[data.verification][language]}</span>
      </div>
      <h4>{field("title")}</h4>
      <p>{field("description")}</p>
      <div className="metric-value">
        <strong>{format(data.after)}</strong> {field("unit")}
      </div>
      {pair && (
        <figure>
          <figcaption>
            {isArabic ? "التغير عن خط الأساس" : "Change from baseline"}:{" "}
            <bdi>{change}</bdi> {field("unit")}
          </figcaption>
          {(["before", "after"] as const).map((key) => (
            <div className="pair-row" key={key}>
              <span>
                {key === "before"
                  ? isArabic
                    ? "قبل"
                    : "Before"
                  : isArabic
                    ? "بعد"
                    : "After"}
              </span>
              <i aria-hidden="true">
                <b
                  style={{
                    insetInlineStart: `${Math.min(pair.zero, pair[key])}%`,
                    width: `${Math.abs(pair.zero - pair[key])}%`,
                  }}
                />
              </i>
              <bdi>
                {format(data[key]!)} {field("unit")}
              </bdi>
            </div>
          ))}
        </figure>
      )}
      {series.length > 1 && (
        <HistoryPlot series={series} unit={data.unit[language]} />
      )}
      <details>
        <summary>{isArabic ? "المنهجية والأدلة" : "Method & evidence"}</summary>
        {data.measuredOn && (
          <time dateTime={data.measuredOn}>{data.measuredOn}</time>
        )}
        <p>{field("period")}</p>
        <p>{field("methodology")}</p>
        {data.evidence
          .filter((item) => item.url)
          .map((item, index) => (
            <a
              key={index}
              href={mediaUrl(item.url)}
              target="_blank"
              rel="noreferrer"
            >
              {item.label[language]} ↗
            </a>
          ))}
      </details>
    </article>
  );
}
