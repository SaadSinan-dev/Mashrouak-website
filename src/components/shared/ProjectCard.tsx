import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '../../types/content';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { ProjectArtwork } from './ProjectArtwork';

export function ProjectCard({ project, featured = false }: { project: Project; featured?: boolean }) {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return (
    <article className={`project-card ${featured ? 'project-card--featured' : ''}`}>
      <Link className="project-card__visual-link" to={`/work/${project.slug}`} aria-label={`${t('a11y.caseStudy')} ${project.name}`}><ProjectArtwork project={project} /></Link>
      <div className="project-card__body"><div className="project-card__meta"><span>{project.categoryLabel}</span><span>{t('projects.visualConcept')}</span></div>
        <div className="project-card__title-row"><div><h3 dir="ltr">{project.name}</h3><p>{project.tagline}</p></div><Link className="project-card__arrow" to={`/work/${project.slug}`} aria-label={`${t('a11y.viewProject')} ${project.name}`}><Arrow size={20} /></Link></div>
      </div>
    </article>
  );
}
