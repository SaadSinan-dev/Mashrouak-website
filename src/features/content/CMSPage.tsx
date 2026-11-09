import { Children, type ReactNode } from "react";
import { usePage,usePlatform } from "../../app/providers/content-context";
import { pageLayouts } from "../../../shared/page-layouts";
import { ManagedSection } from "./ManagedSection";
import { NotFoundPage } from '../not-found/NotFoundPage';

export function CMSPage({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const page = usePage(slug);
  const {content}=usePlatform();
  const nodes = Children.toArray(children);
  const slots = Object.fromEntries(
    (pageLayouts[slug] ?? []).map((id, index) => [id, nodes[index]]),
  );
  if(content&&!page)return <NotFoundPage/>;
  if (!page?.sections.length) return <>{children}</>;
  return (
    <>
      {page.sections.map((section,index) => {
          if(!section.visible)return null;
          const builtIn = slots[section.id];
          return builtIn ? (
            <div
              key={section.id}
              className={`cms-slot cms-slot--${section.background}`}
              data-section-id={section.id}
            >
              {builtIn}
            </div>
          ) : (
            <ManagedSection key={section.id} section={section} pageSlug={slug} index={index}/>
          );
        })}
    </>
  );
}
