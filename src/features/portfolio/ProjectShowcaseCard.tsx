import { ArrowUpRight, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DevicePreview } from './DevicePreview';
import { useLocale } from '../../app/providers/preferences-context';
import { projectText, type PortfolioProject } from './project-feed';

export function ProjectShowcaseCard({ project, prominent = false }: { project: PortfolioProject; prominent?: boolean; index: number }) {
  const { language } = useLocale();
  const copy = projectText(project, language);
  const detail = `/work/${project.id}`;
  return <article className={`showcase-card${prominent ? ' showcase-card--prominent' : ''}`}>
    <DevicePreview images={project.images} category={project.category} title={copy.title} arabic={language === 'ar'} gallery />
    <div className="showcase-card__content">
      <div className="showcase-card__eyebrow"><span>{project.category === 'web' ? (language === 'ar' ? 'منتج ويب' : 'Web product') : (language === 'ar' ? 'تطبيق موبايل' : 'Mobile app')}</span>{project.featured && <span>{language === 'ar' ? 'مميز' : 'Featured'}</span>}</div>
      <h3><Link to={detail}>{copy.title}</Link></h3>
      {copy.shortDescription && <p className="showcase-card__description">{copy.shortDescription}</p>}
      {project.technologies.length > 0 && <ul className="showcase-card__stack" aria-label={language === 'ar' ? 'التقنيات' : 'Technologies'}>{project.technologies.slice(0, 4).map((tech) => <li key={tech}>{tech}</li>)}</ul>}
      <div className="showcase-card__links"><Link to={detail}>{language === 'ar' ? 'تفاصيل المشروع' : 'Project details'} <ArrowUpRight size={16} /></Link>{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">{language === 'ar' ? 'عرض مباشر' : 'Live site'} <ArrowUpRight size={16} /></a>}{project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"><Github size={16} /> GitHub</a>}</div>
    </div>
  </article>;
}
