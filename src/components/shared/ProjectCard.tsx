import {CmsValue} from '../../features/content/Editable';
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "../../types/content";
import { useLocale } from "../../app/providers/preferences-context";
import { ProjectArtwork } from "./ProjectArtwork";

export function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return (
    <article
      className={`project-card ${featured ? "project-card--featured" : ""}`}
    >
      <div className="project-card__visual-link">
        <ProjectArtwork project={project} />
        <Link
          className="project-card__visual-overlay"
          to={`/work/${project.slug}`}
          aria-label={`${t("a11y.caseStudy")} ${project.name}`}
        />
      </div>
      <div className="project-card__body">
        <div className="project-card__meta">
          <span><CmsValue kind="projects" slug={project.slug} path={['categoryLabel']}>{project.categoryLabel}</CmsValue></span>
          <span>{project.visualLabel}</span>
        </div>
        <div className="project-card__title-row">
          <div>
            <h3 dir="ltr"><CmsValue kind="projects" slug={project.slug} path={['name']}>{project.name}</CmsValue></h3>
            <p><CmsValue kind="projects" slug={project.slug} path={['tagline']}>{project.tagline}</CmsValue></p>
          </div>
          <Link
            className="project-card__arrow"
            to={`/work/${project.slug}`}
            aria-label={`${t("a11y.viewProject")} ${project.name}`}
          >
            <Arrow size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
