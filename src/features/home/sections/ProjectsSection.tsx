import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../../app/providers/preferences-context';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';
import { ProjectShowcaseCard } from '../../portfolio/ProjectShowcaseCard';
import { ProjectFeedStatus } from '../../portfolio/ProjectFeedStatus';
import { usePortfolioProjects } from '../../portfolio/usePortfolioProjects';

export function ProjectsSection() {
  const { t, language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const { projects, loading, error, stale, retry } = usePortfolioProjects();
  const selected = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order).slice(0, 3);
  return <section className="projects-section section-space" id="work"><Container>
    <div className="projects-section__heading"><Reveal><SectionHeading eyebrow={t('projects.eyebrow')} title={<>{t('projects.title')}<br /><span>{t('projects.emphasis')}</span></>} description={language === 'ar' ? 'أعمال حقيقية من ملف المشاريع، بتفاصيلها وصورها كما نُشرت.' : 'Selected work, published directly from the project portfolio.'} inverse /></Reveal><Reveal delay={0.1}><Link className="projects-section__all" to="/work">{t('common.viewAll')} <Arrow size={18} /></Link></Reveal></div>
    <ProjectFeedStatus loading={loading && !selected.length} error={error} stale={stale} retry={retry} />
    {selected.length > 0 ? <div className="showcase-grid showcase-grid--home">{selected.map((project, index) => <Reveal key={project.id} className={index === 0 ? 'showcase-grid__lead' : ''} delay={index * 0.07}><ProjectShowcaseCard project={project} prominent={index === 0} index={index} /></Reveal>)}</div> : !loading && !error ? <div className="showcase-status">{language === 'ar' ? 'لا توجد مشاريع منشورة حالياً.' : 'No projects are published yet.'}</div> : null}
  </Container></section>;
}
