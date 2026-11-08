import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { getLocalizedProjectCategories, getLocalizedProjects } from '../../locales/content';
import { ProjectCard } from '../../components/shared/ProjectCard';
import { CTASection } from '../../components/shared/CTASection';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/shared/Reveal';
import { useSEO } from '../../lib/seo';

export function PortfolioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language, isArabic } = useLocale();
  const currentCategory = searchParams.get('category') ?? 'all';
  const projects = getLocalizedProjects(language);
  const categories = getLocalizedProjectCategories(language);
  const Arrow = isArabic ? ArrowDownLeft : ArrowDownRight;
  const filteredProjects = currentCategory === 'all' ? projects : projects.filter((project) => project.category === currentCategory);
  useSEO({ title: t('nav.work'), description: t('projects.pageDescription'), path: '/work' });
  const setCategory = (category: string) => { const next = new URLSearchParams(searchParams); if (category === 'all') next.delete('category'); else next.set('category', category); setSearchParams(next, { replace: true }); };

  return <>
    <section className="page-hero page-hero--dark"><Container className="page-hero__layout"><Reveal><p className="eyebrow eyebrow--light">{t('projects.pageEyebrow')}</p><h1>{t('projects.pageTitle')}<br /><span>{t('projects.pageEmphasis')}</span></h1></Reveal><Reveal delay={0.12}><div className="page-hero__aside"><p>{t('projects.pageDescription')}</p><span className="page-hero__count" dir="auto">0{projects.length} / {t('projects.countLabel')}</span><Arrow className="page-hero__down" size={22} /></div></Reveal></Container></section>
    <section className="portfolio-page section-space"><Container>
      <div className="portfolio-toolbar"><p>{t('projects.filterIntro')}</p><div className="portfolio-filters" role="group" aria-label={t('a11y.filterProjects')}>{categories.map((category) => <button className={currentCategory === category.value ? 'is-active' : ''} key={category.value} type="button" aria-pressed={currentCategory === category.value} onClick={() => setCategory(category.value)}>{category.label}</button>)}</div></div>
      {filteredProjects.length > 0 ? <div className="portfolio-grid">{filteredProjects.map((project, index) => <Reveal key={project.slug} delay={index * 0.06}><ProjectCard project={project} featured={index === 0} /></Reveal>)}</div> : <div className="portfolio-empty"><p>{t('projects.empty')}</p><button type="button" onClick={() => setCategory('all')}>{t('projects.showAll')}</button></div>}
      <p className="portfolio-disclaimer">{t('projects.disclaimerPage')}</p>
    </Container></section>
    <CTASection />
  </>;
}
