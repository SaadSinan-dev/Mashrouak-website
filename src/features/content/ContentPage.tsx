import { useParams } from "react-router-dom";
import { usePage, usePlatform } from "../../app/providers/content-context";
import { useLocale } from "../../app/providers/preferences-context";
import { useSEO } from "../../lib/seo";
import { Container } from "../../components/ui/Container";
import { ManagedSection } from "./ManagedSection";
import { NotFoundPage } from "../not-found/NotFoundPage";
import { PublicPageSkeleton } from "../../components/shared/PublicPageSkeleton";
import { CmsValue } from "./Editable";
export function ContentPage() {
  const { slug = "" } = useParams();
  const page = usePage(slug);
  const { content } = usePlatform();
  const { language, t } = useLocale();
  useSEO({
    title:
      page?.seoTitle[language] || page?.title[language] || t("common.loading"),
    description:
      page?.seoDescription[language] || page?.description[language] || "",
    path: `/pages/${slug}`,
    noIndex: !!content && !page,
  });
  if (!content)
    return <PublicPageSkeleton kind="default" label={t("common.loading")} />;
  if (!page) return <NotFoundPage />;
  return (
    <>
      <section className="page-hero page-hero--light">
        <Container>
          <h1>
            <CmsValue kind="pages" slug={slug} path={["title"]}>
              {page.title[language]}
            </CmsValue>
          </h1>
          <p>
            <CmsValue kind="pages" slug={slug} path={["description"]}>
              {page.description[language]}
            </CmsValue>
          </p>
        </Container>
      </section>
      {page.sections.map((section, index) => (
        <ManagedSection
          key={section.id}
          section={section}
          pageSlug={slug}
          index={index}
        />
      ))}
    </>
  );
}
