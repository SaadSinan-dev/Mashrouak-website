import { lazy, Suspense, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "../../app/providers/preferences-context";
import { usePlatform, useResults } from "../../app/providers/content-context";
import { Container } from "../../components/ui/Container";
import { Reveal } from "../../components/shared/Reveal";
import { CmsCopy } from "../content/Editable";
import { ProjectFeedStatus } from "../portfolio/ProjectFeedStatus";
import { projectText } from "../portfolio/project-feed";
import { usePortfolioProjects } from "../portfolio/usePortfolioProjects";
import { ProjectDossier } from "./ProjectDossier";
import { publicMetric } from "./evidence";
import "./results.css";

const MetricReadout = lazy(() => import("./MetricReadout"));

export function ResultsSection({
  full = false,
  projectSlug,
}: {
  full?: boolean;
  projectSlug?: string;
}) {
  const { language, isArabic } = useLocale();
  const feed = usePortfolioProjects(),
    { preview, unavailable, loading, retry } = usePlatform();
  const entries = useResults(),
    params = new URLSearchParams(location.search);
  const target = preview
    ? entries.find((entry) => entry.id === params.get("metric"))
    : undefined;
  const [selected, select] = useState("");
  const index = Math.max(
    0,
    feed.projects.findIndex(
      (item) =>
        item.id ===
        (projectSlug ||
          selected ||
          target?.data.projectSlug ||
          params.get("project")),
    ),
  );
  const project = feed.projects[index];
  const visible = entries.filter(
    (entry) =>
      publicMetric(entry.data) ||
      (preview && (!params.has("metric") || entry.id === target?.id)),
  );
  const linked = visible.filter(
    (entry) => !!project && entry.data.projectSlug === project.id,
  );
  const orphaned = visible.filter(
    (entry) =>
      !!entry.data.projectSlug &&
      !feed.projects.some((item) => item.id === entry.data.projectSlug),
  );
  const independent = visible.filter(
    (entry) => !entry.data.projectSlug || orphaned.includes(entry),
  );
  const format = new Intl.NumberFormat(language, { minimumIntegerDigits: 2 })
    .format;
  const Previous = isArabic ? ArrowRight : ArrowLeft,
    Next = isArabic ? ArrowLeft : ArrowRight;
  const metrics = (items: typeof entries) => (
    <Suspense
      fallback={
        <p role="status">
          {isArabic ? "جارٍ تحميل القياسات…" : "Loading measurements…"}
        </p>
      }
    >
      <div className="metric-shelf">
        {items.map((entry) => (
          <MetricReadout key={entry.id} entry={entry} />
        ))}
      </div>
    </Suspense>
  );
  if (projectSlug && projectSlug !== project?.id) return null;
  return (
    <section className="results-section section-space" id="results">
      <Container>
        <div className="results-heading">
          <Reveal>
            <p className="eyebrow">
              <CmsCopy
                copyKey="visual.ResultsSection.7519c6fed1"
                ar="نتائجنا / أثر يمكن التحقق منه"
                en="OUR RESULTS / EVIDENCE FIRST"
              />
            </p>
            {full ? (
              <h1>
                <CmsCopy
                  copyKey="visual.ResultsSection.ac71247452"
                  ar="مشاريعنا،"
                  en="The work,"
                />
                <br />
                <span>
                  <CmsCopy
                    copyKey="visual.ResultsSection.d4d2a3f038"
                    ar="بالتفصيل"
                    en="in detail"
                  />
                </span>
              </h1>
            ) : (
              <h2>
                <CmsCopy
                  copyKey="visual.ResultsSection.64d5cb3732"
                  ar="النتيجة أهم من الوعود"
                  en="The result matters more"
                />
                <br />
                <span>
                  <CmsCopy
                    copyKey="visual.ResultsSection.b5406d8a3a"
                    ar="والدليل جزء من العمل"
                    en="than the promise"
                  />
                </span>
              </h2>
            )}
          </Reveal>
          <p>
            <CmsCopy
              copyKey="visual.ResultsSection.7f98debe8c"
              ar="نربط التقنية بهدف عمل واضح، ونوثّق ما تغيّر وكيف قِيس. لا ننشر نسب نمو أو إنجازات عملاء دون أدلة معتمدة."
              en="We connect technology to a clear business objective, documenting what changed and how it was measured. Client achievements are published only with approved evidence."
            />
          </p>
        </div>
        {preview && (
          <p className="results-notice">
            {isArabic
              ? "معاينة تحريرية: قد تتضمن بيانات توضيحية أو غير منشورة."
              : "Editorial preview: may include illustrative or unpublished data."}
          </p>
        )}
        <ProjectFeedStatus {...feed} />
        {project && (
          <>
            {!projectSlug && (
              <div className="file-picker">
                <label>
                  <span className="folio">
                    <BookOpen size={15} />
                    {isArabic ? "فهرس المشاريع" : "Project index"}
                  </span>
                  <select
                    aria-label={isArabic ? "اختر مشروعًا" : "Choose a project"}
                    value={project.id}
                    onChange={(event) => select(event.target.value)}
                  >
                    {feed.projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {projectText(item, language).title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="file-controls">
                  <span dir="ltr">
                    {format(index + 1)} / {format(feed.projects.length)}
                  </span>
                  <button
                    disabled={index === 0}
                    aria-label={
                      isArabic ? "المشروع السابق" : "Previous project"
                    }
                    onClick={() => select(feed.projects[index - 1]!.id)}
                  >
                    <Previous size={18} />
                  </button>
                  <button
                    disabled={index === feed.projects.length - 1}
                    aria-label={isArabic ? "المشروع التالي" : "Next project"}
                    onClick={() => select(feed.projects[index + 1]!.id)}
                  >
                    <Next size={18} />
                  </button>
                </div>
              </div>
            )}
            <ProjectDossier
              key={project.id}
              project={project}
              index={format(index + 1)}
              detail={!!projectSlug}
            />
            {linked.length
              ? metrics(linked)
              : !loading &&
                !unavailable && (
                  <p className="evidence-note">
                    {isArabic
                      ? "هذه التفاصيل موثّقة في سجل المشروع. لم تُنشر قياسات مستقلة للأداء أو أثر الأعمال."
                      : "Documented project scope. No separately verified performance or business measurements have been published for this project."}
                  </p>
                )}
          </>
        )}
        {!project && !feed.loading && !feed.error && (
          <div className="results-empty">
            <h3>
              {isArabic
                ? "لا توجد ملفات مشاريع منشورة بعد"
                : "No project files published yet"}
            </h3>
            <p>
              {isArabic
                ? "تظهر تفاصيل التنفيذ هنا عند نشر المشروع."
                : "Delivery details appear here when a project is published."}
            </p>
          </div>
        )}
        {unavailable && (
          <p className="evidence-note" role="status">
            {isArabic
              ? "تعذّر تحديث القياسات."
              : "Measurement updates are unavailable."}{" "}
            <button onClick={retry}>
              {isArabic ? "إعادة المحاولة" : "Retry"}
            </button>
          </p>
        )}
        {!projectSlug && independent.length > 0 && (
          <>
            <h3 className="shelf-heading">
              {isArabic ? "سجل القياسات" : "Measurement register"}
            </h3>
            {metrics(independent)}
          </>
        )}
        {!full && !projectSlug && (
          <Link className="text-link results-more" to="/results">
            <CmsCopy
              copyKey="visual.ResultsSection.1e4a9b6e21"
              ar="منهجيتنا والنتائج المنشورة"
              en="Our approach and published results"
            />
            <Next size={17} />
          </Link>
        )}
      </Container>
    </section>
  );
}
