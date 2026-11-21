import { useState } from "react";
import { ArrowUpLeft, ArrowUpRight, ChevronDown, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "../../app/providers/preferences-context";
import { projectText, type PortfolioProject } from "../portfolio/project-feed";
import { areas, deliveryMap } from "./evidence";
import { DesignSignature } from "./DesignSignature";

export function ProjectDossier({
  project,
  index,
  detail,
}: {
  project: PortfolioProject;
  index: string;
  detail: boolean;
}) {
  const { language, isArabic } = useLocale();
  const text = projectText(project, language),
    groups = deliveryMap(project, language);
  const [chosen, choose] = useState("");
  const active = groups.find(([area]) => area === chosen) ?? groups[0];
  const [expanded, expand] = useState(false);
  const count = groups.reduce((sum, [, items]) => sum + items.length, 0);
  const format = new Intl.NumberFormat(language).format;
  const tech = [
    ...new Set(project.technologies.map((item) => item.trim()).filter(Boolean)),
  ];
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return (
    <article className="dossier" aria-label={text.title}>
      <div className="dossier-cover">
        <div className="folio">
          <span>{isArabic ? "ملف المشروع" : "Project file"}</span>
          <b dir="ltr">№ {index}</b>
        </div>
        <div className="dossier-head">
          <span className="medium-tag">
            {project.category === "mobile"
              ? isArabic
                ? "تطبيق موبايل"
                : "Mobile application"
              : isArabic
                ? "منتج ويب"
                : "Web product"}
          </span>
          <h3>{text.title}</h3>
          {text.shortDescription && <p>{text.shortDescription}</p>}
        </div>
        <DesignSignature
          project={project}
          language={language}
          fallback={text.features[0]}
        />
        <div className="dossier-foot">
          <span>
            <i />
            {isArabic ? "المصدر: سجل المشروع" : "Source: project record"}
          </span>
          {!detail && (
            <Link to={`/work/${project.id}`}>
              {isArabic ? "دراسة الحالة" : "Case study"} <Arrow size={16} />
            </Link>
          )}
        </div>
      </div>
      <div className="scope-sheet">
        <div className="folio">
          <span>{isArabic ? "تحليل نطاق التنفيذ" : "Scope analysis"}</span>
          <Layers3 size={18} />
        </div>
        <h4>{isArabic ? "خريطة التنفيذ" : "Delivery map"}</h4>
        {active ? (
          <>
            <p className="scope-note">
              {format(count)}{" "}
              {isArabic
                ? "ميزة مدرجة في سجل المشروع، مصنّفة حسب مجال العمل."
                : "features in the project record, grouped by area of work."}
            </p>
            <div
              className="scope-bars"
              aria-label={
                isArabic ? "استكشف مجالات العمل" : "Explore work areas"
              }
            >
              {groups.map(([area, items]) => (
                <button
                  key={area}
                  type="button"
                  aria-pressed={area === active[0]}
                  onClick={() => {
                    choose(area);
                    expand(false);
                  }}
                >
                  <span>{areas[area][language]}</span>
                  <i aria-hidden="true">
                    <b style={{ width: `${(items.length / count) * 100}%` }} />
                  </i>
                  <strong>{format(items.length)}</strong>
                </button>
              ))}
            </div>
            <div className="scope-samples" aria-live="polite">
              <b>{areas[active[0]][language]}</b>
              <ul>
                {active[1].slice(0, expanded ? undefined : 2).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {active[1].length > 2 && (
                <button
                  aria-expanded={expanded}
                  onClick={() => expand(!expanded)}
                >
                  {expanded
                    ? isArabic
                      ? "عرض أقل"
                      : "Show fewer"
                    : isArabic
                      ? `عرض الكل (${format(active[1].length)})`
                      : `Show all ${format(active[1].length)}`}
                </button>
              )}
            </div>
          </>
        ) : (
          <p>
            {isArabic
              ? "لم تُدرج ميزات تفصيلية في سجل المشروع بعد."
              : "No feature breakdown is listed in this project record yet."}
          </p>
        )}
        {tech.length > 0 && (
          <details className="stack-note">
            <summary>
              {isArabic ? "التقنيات المذكورة" : "Documented stack"}{" "}
              <span>
                {format(tech.length)} <ChevronDown size={15} />
              </span>
            </summary>
            <ul>
              {tech.map((item) => (
                <li key={item} dir="auto">
                  {item}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}
