import { useSearchParams } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { CTASection } from '../../components/shared/CTASection';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/shared/Reveal';
import { useSEO } from '../../lib/seo';
import { CMSPage } from '../content/CMSPage';
import { ProjectFeedStatus } from './ProjectFeedStatus';
import { ProjectShowcaseCard } from './ProjectShowcaseCard';
import { usePortfolioProjects } from './usePortfolioProjects';

export function PortfolioPage() {
  const { t, language } = useLocale();
  const [params, setParams] = useSearchParams();
  const requested = params.get('category');
  const category = requested === 'web' || requested === 'mobile' ? requested : 'all';
  const { projects, loading, error, stale, retry } = usePortfolioProjects();
  const filtered = projects.filter((project) => category === 'all' || project.category === category);
  const setCategory = (value: string) => { const next = new URLSearchParams(params); if (value === 'all') next.delete('category'); else next.set('category', value); setParams(next, { replace: true }); };
  useSEO({ title: t('nav.work'), description: t('projects.pageDescription'), path: '/work' });
  const filters = language === 'ar' ? [{ value: 'all', label: 'جميع الأعمال' }, { value: 'web', label: 'ويب' }, { value: 'mobile', label: 'موبايل' }] : [{ value: 'all', label: 'All work' }, { value: 'web', label: 'Web' }, { value: 'mobile', label: 'Mobile' }];
  return <CMSPage slug="work">
    <section className="page-hero page-hero--dark"><Container className="page-hero__layout"><Reveal><p className="eyebrow eyebrow--light">{t('projects.pageEyebrow')}</p><h1>{t('projects.pageTitle')}<br /><span>{t('projects.pageEmphasis')}</span></h1></Reveal><Reveal delay={0.12}><div className="page-hero__aside"><p>{language === 'ar' ? 'أعمال منشورة من ملف المشاريع مباشرة، مع تفاصيلها وصورها وروابطها الأصلية.' : 'Published work from the project portfolio, with its original details, imagery, and links.'}</p><span className="page-hero__count" dir="auto">{String(projects.length).padStart(2, '0')} / {t('projects.countLabel')}</span></div></Reveal></Container></section>
    <section className="portfolio-page section-space"><Container>
      <div className="portfolio-toolbar"><p>{t('projects.filterIntro')}</p><div className="portfolio-filters" role="group" aria-label={t('a11y.filterProjects')}>{filters.map((filter) => <button key={filter.value} className={category === filter.value ? 'is-active' : ''} type="button" aria-pressed={category === filter.value} onClick={() => setCategory(filter.value)}>{filter.label}</button>)}</div></div>
      <ProjectFeedStatus loading={loading && !projects.length} error={error} stale={stale} retry={retry} />
      {filtered.length > 0 ? <div className="showcase-grid showcase-grid--page">{filtered.map((project, index) => <Reveal key={project.id} className={index === 0 && category === 'all' ? 'showcase-grid__lead' : ''} delay={Math.min(index, 4) * 0.05}><ProjectShowcaseCard project={project} prominent={index === 0 && category === 'all'} index={index} /></Reveal>)}</div> : !loading && !error ? <div className="showcase-status">{projects.length ? t('projects.empty') : (language === 'ar' ? 'لا توجد مشاريع منشورة حالياً.' : 'No projects are published yet.')}</div> : null}
    </Container></section><CTASection />
  </CMSPage>;
}
