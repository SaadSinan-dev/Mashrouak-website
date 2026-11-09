import type { z } from "zod";
import type { sectionSchema } from "../../../shared/schema";
import { useLocale } from "../../app/providers/preferences-context";
import { Container } from "../../components/ui/Container";
import { ButtonLink } from "../../components/ui/Button";
import { SmartImage } from "../../components/shared/SmartImage";
import { mediaUrl } from "../../lib/platform-api";
import { lazy, Suspense } from "react";
import { SkeletonRegion, SkeletonText } from "../../../shared/ui/Skeleton";
import {CmsValue} from './Editable';
const RichText = lazy(() =>
  import("../../components/shared/RichText").then((module) => ({
    default: module.RichText,
  })),
);

export function ManagedSection({
  section,
  pageSlug,index=0,
}: {
  section: z.infer<typeof sectionSchema>;
  pageSlug?:string;index?:number;
}) {
  const { language, t } = useLocale();
  if (!section.visible) return null;
  return (
    <section
      id={section.id}
      data-section-id={section.id}
      className={`managed-section section-space managed-section--${section.background}`}
    >
      <Container>
        <div className="managed-section__text">
          {section.title[language] && <h2><CmsValue kind="pages" slug={pageSlug} path={['sections',index,'title']} label="Section heading">{section.title[language]}</CmsValue></h2>}
          {section.body[language] && (
            <Suspense
              fallback={
                <SkeletonRegion label={t("common.loading")}>
                  <SkeletonText
                    lines={Math.max(
                      2,
                      Math.min(
                        12,
                        Math.ceil(section.body[language].length / 75),
                      ),
                    )}
                  />
                </SkeletonRegion>
              }
            >
              <CmsValue kind="pages" slug={pageSlug} path={['sections',index,'body']} label="Section body" rich><RichText>{section.body[language]}</RichText></CmsValue>
            </Suspense>
          )}
          {section.buttonUrl && section.buttonLabel[language] && (
            <ButtonLink to={section.buttonUrl}>
              <CmsValue kind="pages" slug={pageSlug} path={['sections',index]} label="Section button and destination">{section.buttonLabel[language]}</CmsValue>
            </ButtonLink>
          )}
        </div>
        {section.image && (
          <CmsValue kind="pages" slug={pageSlug} path={['sections',index,'image']} label="Section image" image><SmartImage
            src={mediaUrl(section.image.url)}
            alt={section.image.alt[language]}
            width={1200}
            height={750}
          /></CmsValue>
        )}
      </Container>
    </section>
  );
}
