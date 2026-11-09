import { useProjects } from '../../../app/providers/content-context';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../../app/providers/preferences-context';
import { ProjectCard } from '../../../components/shared/ProjectCard';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';

export function ProjectsSection() {
  const { t, language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const projects = useProjects(language).filter(project=>project.cms?.featured??true);
  return (
    <section className="projects-section section-space" id="work">
      <Container>
        <div className="projects-section__heading"><Reveal><SectionHeading eyebrow={t('projects.eyebrow')} title={<>{t('projects.title')}<br /><span>{t('projects.emphasis')}</span></>} description={t('projects.description')} inverse /></Reveal><Reveal delay={0.1}><Link className="projects-section__all" to="/work">{t('common.viewAll')} <Arrow size={18} /></Link></Reveal></div>
        <div className="projects-grid">{projects.map((project, index) => <Reveal className={index === 0 ? 'projects-grid__featured' : ''} key={project.slug} delay={index * 0.08}><ProjectCard project={project} featured={index === 0} /></Reveal>)}</div>
        <p className="projects-section__disclaimer"><span /> {t('projects.disclaimer')}</p>
      </Container>
    </section>
  );
}
