import { ArrowUpLeft, ArrowUpRight, Github } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { CTASection } from '../../components/shared/CTASection';
import { DevicePreview } from './DevicePreview';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/shared/Reveal';
import { useSEO } from '../../lib/seo';
import { NotFoundPage } from '../not-found/NotFoundPage';
import { ProjectFeedStatus } from './ProjectFeedStatus';
import { ProjectShowcaseCard } from './ProjectShowcaseCard';
import { projectText } from './project-feed';
import { usePortfolioProjects } from './usePortfolioProjects';

export function CaseStudyPage() {
  const { slug } = useParams();
  const { language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const { projects, loading, error, stale, retry } = usePortfolioProjects();
  const project = projects.find((item) => item.id === slug);
  const copy = project ? projectText(project, language) : null;
  useSEO({ title: copy?.title || (isArabic ? 'المشروع' : 'Project'), description: copy?.shortDescription || '', path: `/work/${slug ?? ''}`, noIndex: !project });
  if (!project || !copy) return loading || error ? <div className="container-shell section-space"><ProjectFeedStatus loading={loading} error={error} stale={stale} retry={retry} /></div> : <NotFoundPage />;
  const related = projects.filter((item) => item.id !== project.id).slice(0, 2);
  return <>
    <section className="showcase-detail-hero"><Container><nav className="showcase-detail-crumb" aria-label={isArabic ? 'مسار التنقل' : 'Breadcrumb'}><Link to="/">{isArabic ? 'الرئيسية' : 'Home'}</Link><span>/</span><Link to="/work">{isArabic ? 'الأعمال' : 'Work'}</Link><span>/</span><span>{copy.title}</span></nav><Reveal><div className="showcase-detail-hero__heading"><div><p className="eyebrow">{project.category === 'web' ? (isArabic ? 'منتج ويب' : 'Web product') : (isArabic ? 'تطبيق موبايل' : 'Mobile app')}{project.featured ? ` / ${isArabic ? 'مميز' : 'Featured'}` : ''}</p><h1>{copy.title}</h1>{copy.shortDescription && <p>{copy.shortDescription}</p>}</div><span className="showcase-detail-hero__number">{String(projects.indexOf(project) + 1).padStart(2, '0')}</span></div></Reveal>
      <DevicePreview images={project.images} category={project.category} title={copy.title} arabic={isArabic} gallery />
      <ProjectFeedStatus loading={false} error={error} stale={stale} retry={retry} />
    </Container></section>
    <section className="showcase-detail-body section-space"><Container><div className="showcase-detail-body__layout"><div><p className="eyebrow">{isArabic ? 'عن المشروع' : 'About the project'}</p><h2>{copy.focus || copy.title}</h2><div className="showcase-detail-links">{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">{isArabic ? 'زيارة المشروع' : 'Visit project'} <Arrow size={18} /></a>}{project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"><Github size={18} /> GitHub</a>}</div></div><div>{copy.description && <p className="showcase-detail-body__description">{copy.description}</p>}{project.technologies.length > 0 && <div className="showcase-detail-group"><h3>{isArabic ? 'التقنيات' : 'Technologies'}</h3><ul className="showcase-card__stack">{project.technologies.map((tech) => <li key={tech}>{tech}</li>)}</ul></div>}{copy.features.length > 0 && <div className="showcase-detail-group"><h3>{isArabic ? 'الميزات' : 'Features'}</h3><ul className="showcase-detail-features">{copy.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div>}</div></div></Container></section>
    {related.length > 0 && <section className="showcase-related section-space"><Container><div className="showcase-related__heading"><h2>{isArabic ? 'أعمال أخرى' : 'More work'}</h2><Link to="/work">{isArabic ? 'كل الأعمال' : 'All work'} <Arrow size={17} /></Link></div><div className="showcase-grid showcase-grid--related">{related.map((item, index) => <ProjectShowcaseCard key={item.id} project={item} index={index} />)}</div></Container></section>}
    <CTASection />
  </>;
}
