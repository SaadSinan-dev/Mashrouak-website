import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, Check } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { getLocalizedProjects } from '../../locales/content';
import { CTASection } from '../../components/shared/CTASection';
import { ProjectArtwork } from '../../components/shared/ProjectArtwork';
import { Reveal } from '../../components/shared/Reveal';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { useSEO } from '../../lib/seo';
import { NotFoundPage } from '../not-found/NotFoundPage';
import { CaseGallery } from './components/CaseGallery';

export function CaseStudyPage() {
  const { slug } = useParams();
  const { t, language, isArabic } = useLocale();
  const ArrowUp = isArabic ? ArrowUpLeft : ArrowUpRight;
  const ArrowCrumb = isArabic ? ArrowLeft : ArrowRight;
  const projects = getLocalizedProjects(language);
  const project = projects.find((item) => item.slug === slug);
  useSEO({ title: project?.name ?? t('case.notFound'), description: project?.overview ?? t('case.notFoundDescription'), path: `/work/${slug ?? ''}`, noIndex: !project });
  if (!project) return <NotFoundPage />;
  const related = projects.filter((item) => item.slug !== project.slug);

  return <>
    <section className="case-hero"><Container>
      <div className="breadcrumbs"><Link to="/">{t('case.breadcrumbHome')}</Link><ArrowCrumb size={13} /><Link to="/work">{t('case.breadcrumbWork')}</Link><ArrowCrumb size={13} /><span dir="ltr">{project.name}</span></div>
      <div className="case-hero__heading"><Reveal><p className="eyebrow">{project.categoryLabel} / {t('case.label')}</p><h1 dir="ltr">{project.name}</h1><p>{project.tagline}</p></Reveal><Reveal delay={0.1}><span className="case-hero__index" dir="auto">{t('case.indexPrefix')} / {project.slug.toUpperCase()}</span><Link to="/contact" className="text-link">{t('case.discussSimilar')} <ArrowUp size={17} /></Link></Reveal></div>
      <Reveal className="case-hero__artwork"><ProjectArtwork project={project} /></Reveal><p className="case-hero__disclaimer">{t('case.visualDisclaimer')}</p>
    </Container></section>
    <section className="case-overview section-space"><Container className="case-overview__layout"><div><p className="eyebrow">01 / {t('case.overview')}</p><h2>{t('case.overviewTitle')}<br /><span>{t('case.overviewEmphasis')}</span></h2></div><div><p>{project.overview}</p><p>{t('case.contextNote')}</p></div></Container></section>
    <section className="case-analysis section-space"><Container><div className="case-analysis__grid"><Reveal><div className="case-analysis__block"><span>02 / {t('case.challenge')}</span><h2>{t('case.challengeTitle')}</h2><p>{project.challenge}</p></div></Reveal><Reveal delay={0.1}><div className="case-analysis__block case-analysis__block--solution"><span>03 / {t('case.solution')}</span><h2>{t('case.solutionTitle')}</h2><p>{project.solution}</p></div></Reveal></div></Container></section>
    <section className="case-approach section-space"><Container className="case-approach__layout"><Reveal><SectionHeading eyebrow={`04 / ${t('case.approach')}`} title={<>{t('case.approachTitle')}<br /><span>{t('case.approachEmphasis')}</span></>} /></Reveal><Reveal delay={0.1}><p>{project.designApproach}</p></Reveal></Container></section>
    <section className="case-features section-space"><Container><SectionHeading eyebrow={`05 / ${t('case.features')}`} title={t('case.featuresTitle')} description={t('case.featuresDescription')} /><div className="case-features__list">{project.features.map((feature, index) => <div className="case-feature" key={feature}><span dir="ltr">0{index + 1}</span><p>{feature}</p><Check size={17} /></div>)}</div></Container></section>
    <section className="case-development section-space"><Container><div className="case-development__heading"><SectionHeading eyebrow={`06 / ${t('case.development')}`} title={<>{t('case.developmentTitle')}<br /><span>{t('case.developmentEmphasis')}</span></>} description={t('case.developmentDescription')} /></div><div className="case-development__list">{project.developmentHighlights.map((item, index) => <article key={item}><span dir="ltr">0{index + 1}</span><p>{item}</p><Check size={17} /></article>)}</div></Container></section>
    <CaseGallery project={project} />
    <section className="case-final section-space"><Container><div className="case-final__panel"><div><p className="eyebrow eyebrow--light">08 / {t('case.summary')}</p><h2>{project.tagline}</h2><p>{t('case.summaryDescription')}</p></div><Link to="/contact" className="case-final__link">{t('case.discussSimilar')} <ArrowUp size={18} /></Link></div></Container></section>
    <section className="case-related section-space"><Container><div className="case-related__heading"><SectionHeading eyebrow={`09 / ${t('case.related')}`} title={t('case.relatedTitle')} /><Link to="/work" className="text-link">{t('case.relatedAll')} <ArrowUp size={17} /></Link></div><div className="case-related__grid">{related.map((item) => <article key={item.slug}><Link to={`/work/${item.slug}`}><span>{item.categoryLabel}</span><h3 dir="ltr">{item.name}</h3><p>{item.tagline}</p><ArrowUp size={19} /></Link></article>)}</div></Container></section>
    <CTASection />
  </>;
}
