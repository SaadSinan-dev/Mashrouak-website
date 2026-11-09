import {CmsText,CmsValue,CmsCopy} from '../content/Editable';
import { useProjects } from '../../app/providers/content-context';
import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, Check } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { CTASection } from '../../components/shared/CTASection';
import { ProjectArtwork } from '../../components/shared/ProjectArtwork';
import { Reveal } from '../../components/shared/Reveal';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { useSEO } from '../../lib/seo';
import { NotFoundPage } from '../not-found/NotFoundPage';
import { CaseGallery } from './components/CaseGallery';
import { ResultsSection } from '../results/ResultsSection';

export function CaseStudyPage() {
  const { slug } = useParams();
  const { t, language, isArabic } = useLocale();
  const ArrowUp = isArabic ? ArrowUpLeft : ArrowUpRight;
  const ArrowCrumb = isArabic ? ArrowLeft : ArrowRight;
  const projects = useProjects(language);
  const project = projects.find((item) => item.slug === slug);
  useSEO({ title: project?.cms?.seoTitle[language] || project?.name || t('case.notFound'), description: project?.cms?.seoDescription[language] || project?.overview || t('case.notFoundDescription'), path: `/work/${slug ?? ''}`, noIndex: !project });
  if (!project) return <NotFoundPage />;
  const related = projects.filter((item) => item.slug !== project.slug);

  return <>
    <section className="case-hero"><Container>
      <div className="breadcrumbs"><Link to="/"><CmsText k="case.breadcrumbHome"/></Link><ArrowCrumb size={13} /><Link to="/work"><CmsText k="case.breadcrumbWork"/></Link><ArrowCrumb size={13} /><span dir="ltr"><CmsValue kind="projects" slug={project.slug} path={['name']}>{project.name}</CmsValue></span></div>
      <div className="case-hero__heading"><Reveal><p className="eyebrow"><CmsValue kind="projects" slug={project.slug} path={['categoryLabel']}>{project.categoryLabel}</CmsValue> / <CmsText k="case.label"/></p><h1 dir="ltr"><CmsValue kind="projects" slug={project.slug} path={['name']}>{project.name}</CmsValue></h1><p><CmsValue kind="projects" slug={project.slug} path={['tagline']}>{project.tagline}</CmsValue></p></Reveal><Reveal delay={0.1}><span className="case-hero__index" dir="auto"><CmsText k="case.indexPrefix"/> / {project.slug.toUpperCase()}</span><Link to="/contact" className="text-link"><CmsText k="case.discussSimilar"/> <ArrowUp size={17} /></Link></Reveal></div>
      <Reveal className="case-hero__artwork"><ProjectArtwork project={project} /></Reveal><p className="case-hero__disclaimer">{project.cms?.illustrative===false?project.visualLabel:t('case.visualDisclaimer')}</p>
    </Container></section>
    <section className="case-overview section-space"><Container className="case-overview__layout"><div><p className="eyebrow">01 / <CmsText k="case.overview"/></p><h2><CmsText k="case.overviewTitle"/><br /><span><CmsText k="case.overviewEmphasis"/></span></h2></div><div><p><CmsValue kind="projects" slug={project.slug} path={['overview']}>{project.overview}</CmsValue></p><p><CmsText k="case.contextNote"/></p></div></Container></section>
    <section className="case-analysis section-space"><Container><div className="case-analysis__grid"><Reveal><div className="case-analysis__block"><span>02 / <CmsText k="case.challenge"/></span><h2><CmsText k="case.challengeTitle"/></h2><p><CmsValue kind="projects" slug={project.slug} path={['challenge']}>{project.challenge}</CmsValue></p></div></Reveal><Reveal delay={0.1}><div className="case-analysis__block case-analysis__block--solution"><span>03 / <CmsText k="case.solution"/></span><h2><CmsText k="case.solutionTitle"/></h2><p><CmsValue kind="projects" slug={project.slug} path={['solution']}>{project.solution}</CmsValue></p></div></Reveal></div></Container></section>
    <section className="case-approach section-space"><Container className="case-approach__layout"><Reveal><SectionHeading eyebrow={`04 / ${t('case.approach')}`} title={<><CmsText k="case.approachTitle"/><br /><span><CmsText k="case.approachEmphasis"/></span></>} /></Reveal><Reveal delay={0.1}><p><CmsValue kind="projects" slug={project.slug} path={['designApproach']}>{project.designApproach}</CmsValue></p></Reveal></Container></section>
    <section className="case-features section-space"><Container><SectionHeading eyebrow={`05 / ${t('case.features')}`} title={<CmsText k="case.featuresTitle"/>} description={<CmsText k="case.featuresDescription"/>} /><div className="case-features__list">{project.features.map((feature, index) => <div className="case-feature" key={feature}><span dir="ltr">0{index + 1}</span><p>{feature}</p><Check size={17} /></div>)}</div></Container></section>
    <section className="case-development section-space"><Container><div className="case-development__heading"><SectionHeading eyebrow={`06 / ${t('case.development')}`} title={<><CmsText k="case.developmentTitle"/><br /><span><CmsText k="case.developmentEmphasis"/></span></>} description={<CmsText k="case.developmentDescription"/>} /></div><div className="case-development__list">{project.developmentHighlights.map((item, index) => <article key={item}><span dir="ltr">0{index + 1}</span><p>{item}</p><Check size={17} /></article>)}</div></Container></section>
    {project.cms&&<section className="case-cms-details section-space"><Container><div className="case-cms-details__grid">{project.cms.goals.length>0&&<div><h2><CmsCopy copyKey="visual.CaseStudyPage.9f59479943" ar="أهداف المشروع" en="Project goals"/></h2><ul>{project.cms.goals.map((goal,index)=><li key={index}>{goal[language]}</li>)}</ul></div>}{project.cms.services.length>0&&<div><h2><CmsCopy copyKey="visual.CaseStudyPage.d92d22a46a" ar="الخدمات المقدّمة" en="Services delivered"/></h2><ul>{project.cms.services.map((service,index)=><li key={index}>{service[language]}</li>)}</ul></div>}{project.cms.technologies.length>0&&<div><h2><CmsCopy copyKey="visual.CaseStudyPage.2b4df1dad9" ar="التقنيات" en="Technology stack"/></h2><ul className="technology-list" dir="ltr">{project.cms.technologies.map(tech=><li key={tech}>{tech}</li>)}</ul></div>}</div>{project.cms.externalUrl&&<a className="text-link" href={project.cms.externalUrl} target="_blank" rel="noopener noreferrer"><CmsCopy copyKey="visual.CaseStudyPage.b53ff87bad" ar="زيارة المشروع" en="Visit project"/> <ArrowUp size={17}/></a>}</Container></section>}
    <CaseGallery project={project} />
    <ResultsSection projectSlug={project.slug}/>
    <section className="case-final section-space"><Container><div className="case-final__panel"><div><p className="eyebrow eyebrow--light">08 / <CmsText k="case.summary"/></p><h2><CmsValue kind="projects" slug={project.slug} path={['tagline']}>{project.tagline}</CmsValue></h2><p><CmsText k="case.summaryDescription"/></p></div><Link to="/contact" className="case-final__link"><CmsText k="case.discussSimilar"/> <ArrowUp size={18} /></Link></div></Container></section>
    <section className="case-related section-space"><Container><div className="case-related__heading"><SectionHeading eyebrow={`09 / ${t('case.related')}`} title={<CmsText k="case.relatedTitle"/>} /><Link to="/work" className="text-link"><CmsText k="case.relatedAll"/> <ArrowUp size={17} /></Link></div><div className="case-related__grid">{related.map((item) => <article key={item.slug}><Link to={`/work/${item.slug}`}><span>{item.categoryLabel}</span><h3 dir="ltr">{item.name}</h3><p>{item.tagline}</p><ArrowUp size={19} /></Link></article>)}</div></Container></section>
    <CTASection />
  </>;
}
