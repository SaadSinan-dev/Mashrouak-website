import type { PortfolioProject } from "../portfolio/project-feed";
import { recordHighlight, designSignature } from "./record-highlight";

export function DesignSignature({
  project,
  language,
  fallback,
}: {
  project: PortfolioProject;
  language: "ar" | "en";
  fallback?: string;
}) {
  const highlight = recordHighlight(project),
    locale = language === "ar" ? 1 : 0;
  if (highlight)
    return (
      <div className="record-reading">
        <strong>
          {new Intl.NumberFormat(language).format(highlight.value)}
        </strong>
        <span>{highlight.label[language]}</span>
      </div>
    );
  const signature = designSignature(project);
  if (signature)
    return (
      <div className="record-detail">
        <small>{signature.label[locale]}</small>
        <ul className="signature-parts">
          {signature.parts.map((part) => (
            <li key={part[0]}>{part[locale]}</li>
          ))}
        </ul>
      </div>
    );
  return fallback ? (
    <div className="record-detail">
      <small>{locale ? "من تفاصيل التنفيذ" : "Implementation detail"}</small>
      <p>{fallback}</p>
    </div>
  ) : null;
}
