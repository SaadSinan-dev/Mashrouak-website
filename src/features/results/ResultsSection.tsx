import {CmsCopy,CmsValue}from '../content/Editable';
import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownToLine,
  Check,
  FileCheck2,
  ScanLine,
  ChartNoAxesCombined,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "../../app/providers/preferences-context";
import { useResults } from "../../app/providers/content-context";
import { Container } from "../../components/ui/Container";
import { Reveal } from "../../components/shared/Reveal";
import { mediaUrl } from "../../lib/platform-api";
import { usePortfolioProjects } from "../portfolio/usePortfolioProjects";

export function ResultsSection({ full = false,projectSlug }: { full?: boolean;projectSlug?:string }) {
  const { language, isArabic } = useLocale();
  const results = useResults().filter(entry=>!projectSlug||entry.data.projectSlug===projectSlug);
  const projectIds = new Set(usePortfolioProjects().projects.map((project) => project.id));
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const format = (v: number) =>
    new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(v);
  const principles = isArabic
    ? [
        ["نحدد نقطة البداية", "نوثّق الوضع الحالي والهدف قبل بدء التطوير"],
        ["نقيس بالطريقة نفسها", "نقارن ضمن فترة واضحة وبأدوات ومنهجية موثّقة"],
        ["ننشر ما يمكن إثباته", "نربط كل نتيجة بمصدرها وسياق المشروع"],
      ]
    : [
        [
          "Establish the baseline",
          "Document the starting point and objective before development",
        ],
        [
          "Measure consistently",
          "Compare a defined period with documented tools and methods",
        ],
        [
          "Publish the evidence",
          "Connect every result to its source and project context",
        ],
      ];
  if(projectSlug&&!results.length)return null;
  return (
    <section className="results-section section-space" id="results">
      <Container>
        <div className="results-heading">
          <Reveal>
            <p className="eyebrow">
              <CmsCopy copyKey="visual.ResultsSection.7519c6fed1" ar="نتائجنا / أثر يمكن التحقق منه" en="OUR RESULTS / EVIDENCE FIRST"/>
            </p>
            {full ? (
              <h1>
                <CmsCopy copyKey="visual.ResultsSection.ac71247452" ar="أثر واضح،" en="Clear impact,"/>
                <br />
                <span><CmsCopy copyKey="visual.ResultsSection.d4d2a3f038" ar="تدعمه الأدلة" en="backed by evidence"/></span>
              </h1>
            ) : (
              <h2>
                <CmsCopy copyKey="visual.ResultsSection.64d5cb3732" ar="النتيجة أهم من الوعود" en="The result matters more"/>
                <br />
                <span>
                  <CmsCopy copyKey="visual.ResultsSection.b5406d8a3a" ar="والدليل جزء من العمل" en="than the promise"/>
                </span>
              </h2>
            )}
          </Reveal>
          <p>
            <CmsCopy copyKey="visual.ResultsSection.7f98debe8c" ar="نربط التقنية بهدف عمل واضح، ونوثّق ما تغيّر وكيف قِيس. لا ننشر نسب نمو أو إنجازات عملاء دون أدلة معتمدة." en="We connect technology to a clear business objective, documenting what changed and how it was measured. Client achievements are published only with approved evidence."/>
          </p>
        </div>
        {results.length > 0 ? (
          <div className="result-ledger">
            {results.map(({ id, slug, data }) => {
              const max = Math.max(
                Math.abs(data.before),
                Math.abs(data.after),
                1,
              );
              return (
                <Reveal key={id}>
                  <article className="result-row" id={slug}>
                    <div className="result-row__intro">
                      <span
                        className={`result-state result-state--${data.verification}`}
                      >
                        <FileCheck2 size={14} />
                        {data.verification === "verified"
                          ? isArabic
                            ? "نتيجة موثّقة"
                            : "Verified result"
                          : data.verification === "draft"
                            ? isArabic
                              ? "مسودة للمعاينة فقط"
                              : "Draft preview only"
                            : isArabic
                              ? "مثال توضيحي — ليس نتيجة عميل"
                              : "Illustrative example — not a client result"}
                      </span>
                      <h3><CmsValue entryId={id} path={['title']}>{data.title[language]}</CmsValue></h3>
                      <p><CmsValue entryId={id} path={['description']}>{data.description[language]}</CmsValue></p>
                      {data.projectSlug && projectIds.has(data.projectSlug) && (
                        <Link
                          className="text-link"
                          to={`/work/${data.projectSlug}`}
                        >
                          <CmsCopy copyKey="visual.ResultsSection.bf046a5dbb" ar="المشروع المرتبط" en="Associated project"/>
                          <Arrow size={15} />
                        </Link>
                      )}
                    </div>
                    <div
                      className="result-comparison"
                      aria-label={
                        isArabic
                          ? "مقارنة قبل وبعد"
                          : "Before and after comparison"
                      }
                    >
                      {[
                        ["before", data.before],
                        ["after", data.after],
                      ].map(([key, value]) => (
                        <div key={key}>
                          <div>
                            <span>
                              {key === "before"
                                ? isArabic
                                  ? "قبل"
                                  : "Before"
                                : isArabic
                                  ? "بعد"
                                  : "After"}
                            </span>
                            <strong>
                              {format(Number(value))}{" "}
                              <small><CmsValue entryId={id} path={['unit']}>{data.unit[language]}</CmsValue></small>
                            </strong>
                          </div>
                          <i>
                            <b
                              style={{
                                width: `${Math.max(2, (Math.abs(Number(value)) / max) * 100)}%`,
                              }}
                            />
                          </i>
                        </div>
                      ))}
                    </div>
                    <details>
                      <summary>
                        <CmsCopy copyKey="visual.ResultsSection.292c103ba0" ar="فترة القياس والمنهجية والمصادر" en="Measurement period, methodology & sources"/>
                      </summary>
                      <p><CmsValue entryId={id} path={['period']}>{data.period[language]}</CmsValue></p>
                      <p><CmsValue entryId={id} path={['methodology']}>{data.methodology[language]}</CmsValue></p>
                      {data.evidence.map((e, i) => (
                        <a
                          key={i}
                          href={mediaUrl(e.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowDownToLine size={14} />
                          {e.label[language]}
                        </a>
                      ))}
                    </details>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <div className="results-method">
            <div className="results-method__note">
              <ChartNoAxesCombined size={32} strokeWidth={1.3} />
              <h3>
                <CmsCopy copyKey="visual.ResultsSection.0e09b097e5" ar="القياس يبدأ بسؤال صحيح" en="Good measurement starts with the right question"/>
              </h3>
              <p>
                <CmsCopy copyKey="visual.ResultsSection.c529676b54" ar="لم تُنشر نتائج رقمية موثّقة بعد. نستعرض هنا طريقة القياس؛ الأعمال المعروضة في معرضنا موضّحة حسب حالتها الفعلية." en="No verified numerical results have been published yet. This is our measurement approach; portfolio work is labelled according to its actual status."/>
              </p>
              <Link to="/work">
                <CmsCopy copyKey="visual.ResultsSection.9c1650bc7a" ar="استعرض الأعمال" en="Explore the work"/>{" "}
                <Arrow size={16} />
              </Link>
            </div>
            <ol>
              {principles.map(([title, body], index) => (
                <li key={title}>
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                  {index === 2 ? <Check size={18} /> : <ScanLine size={18} />}
                </li>
              ))}
            </ol>
          </div>
        )}
        {!full && (
          <Link className="text-link results-more" to="/results">
            <CmsCopy copyKey="visual.ResultsSection.1e4a9b6e21" ar="منهجيتنا والنتائج المنشورة" en="Our approach and published results"/>{" "}
            <Arrow size={17} />
          </Link>
        )}
      </Container>
    </section>
  );
}
