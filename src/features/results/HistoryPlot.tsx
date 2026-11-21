import { useState } from "react";
import { useLocale } from "../../app/providers/preferences-context";

type Observation = { date: string; value: number };
export function HistoryPlot({
  series,
  unit,
}: {
  series: Observation[];
  unit: string;
}) {
  const { language, isArabic } = useLocale();
  const [picked, pick] = useState("");
  const format = new Intl.NumberFormat(language, {
    maximumSignificantDigits: 15,
  }).format;
  const current =
    series.find((point) => point.date === picked) ?? series[series.length - 1]!;
  const times = series.map((point) => Date.parse(point.date)),
    values = series.map((point) => point.value);
  const low = Math.min(...values),
    high = Math.max(...values);
  const coords = series.map((point, index) => {
    const elapsed = (times[index]! - times[0]!) / (times.at(-1)! - times[0]!);
    return [
      6 + (isArabic ? 1 - elapsed : elapsed) * 288,
      high === low ? 39 : 68 - ((point.value - low) / (high - low)) * 58,
    ];
  });
  return (
    <figure className="history-plot">
      <figcaption>
        {isArabic ? "سجل القياسات المؤرخة" : "Measurement history"}
      </figcaption>
      <div className="history-chart">
        <svg
          viewBox="0 0 300 78"
          role="img"
          aria-label={
            isArabic
              ? "منحنى زمني. تتوفر القيم الدقيقة في الجدول."
              : "Trend over elapsed time. Exact values are available in the table."
          }
        >
          <path
            d="M6 68H294 M6 39H294 M6 10H294"
            fill="none"
            stroke="var(--line)"
          />
          <polyline
            points={coords.map((point) => point.join(",")).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {coords.map(([left, top], index) => (
            <circle
              key={series[index]!.date}
              cx={left}
              cy={top}
              r={series[index] === current ? 4 : 2.5}
              fill="currentColor"
            >
              <title>
                {series[index]!.date}: {format(values[index]!)} {unit}
              </title>
            </circle>
          ))}
        </svg>
        <div className="time-axis">
          <bdi>{series[0]!.date}</bdi>
          <bdi>{series.at(-1)!.date}</bdi>
        </div>
      </div>
      <label className="history-inspect">
        <span>{isArabic ? "استكشف القراءات" : "Inspect reading"}</span>
        <select
          value={current.date}
          onChange={(event) => pick(event.target.value)}
        >
          {series.map((point) => (
            <option key={point.date}>{point.date}</option>
          ))}
        </select>
        <output aria-live="polite">
          {format(current.value)} {unit}
        </output>
      </label>
      <details>
        <summary>{isArabic ? "عرض القراءات" : "View readings"}</summary>
        <table>
          <thead>
            <tr>
              <th>{isArabic ? "التاريخ" : "Date"}</th>
              <th>{unit}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((point) => (
              <tr key={point.date}>
                <th scope="row">
                  <bdi>{point.date}</bdi>
                </th>
                <td>{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
