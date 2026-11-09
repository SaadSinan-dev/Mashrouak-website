import {CmsText} from '../content/Editable';
import { ArrowUpLeft, ArrowUpRight, Compass, HeartHandshake, Layers3, Sparkles } from 'lucide-react';
import { CMSPage } from '../content/CMSPage';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import type { TranslationKey } from '../../locales/messages';
import { CTASection } from '../../components/shared/CTASection';
import { Logo } from '../../components/shared/Logo';
import { Reveal } from '../../components/shared/Reveal';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { useSEO } from '../../lib/seo';

const valueIcons = [Compass, Layers3, HeartHandshake, Sparkles];

export function AboutPage() {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  useSEO({ title: t('nav.about'), description: t('about.description'), path: '/about' });
  return <CMSPage slug="about">
    <section className="page-hero page-hero--light about-hero"><Container className="page-hero__layout">
      <Reveal><p className="eyebrow"><CmsText k="about.eyebrow"/></p><h1><CmsText k="about.title"/> <span className="about-hero__brand"><Logo width={isArabic ? 246 : 228} /></span><br /><span><CmsText k="about.emphasis"/></span></h1></Reveal>
      <Reveal delay={0.12}><div className="page-hero__aside"><p><CmsText k="about.description"/></p><span><CmsText k="about.studioType"/></span><Link to="/contact" className="text-link"><CmsText k="about.link"/> <Arrow size={17} /></Link></div></Reveal>
    </Container></section>
    <section className="about-statement section-space"><Container className="about-statement__layout"><div><p className="eyebrow"><CmsText k="about.philosophy"/></p><h2><CmsText k="about.statementTitle"/><br /><CmsText k="about.statementLine"/> <span><CmsText k="about.need"/></span></h2></div><div><p><CmsText k="about.statement1"/></p><p><CmsText k="about.statement2"/></p></div></Container></section>
    <section className="about-values section-space"><Container><SectionHeading eyebrow={<CmsText k="about.valuesEyebrow"/>} title={<><CmsText k="about.valuesTitle"/><br /><span><CmsText k="about.valuesEmphasis"/></span></>} description={<CmsText k="about.valuesDescription"/>} /><div className="about-values__grid">{valueIcons.map((Icon, index) => <Reveal key={index} delay={index * 0.06}><article className="about-value"><div><span dir="ltr">0{index + 1}</span><Icon size={22} /></div><h3><CmsText k={`about.value.${index + 1}.title` as TranslationKey}/></h3><p><CmsText k={`about.value.${index + 1}.text` as TranslationKey}/></p></article></Reveal>)}</div></Container></section>
    <section className="about-commitment section-space"><Container><div className="about-commitment__panel"><p className="eyebrow eyebrow--light"><CmsText k="about.commitment"/></p><h2><CmsText k="about.commitmentTitle"/><br /><span><CmsText k="about.commitmentEmphasis"/></span><br /><CmsText k="about.commitmentLine"/></h2><p><CmsText k="about.commitmentText"/></p><Link to="/process" className="text-link text-link--light"><CmsText k="about.commitmentLink"/> <Arrow size={17} /></Link></div></Container></section>
    <CTASection />
  </CMSPage>;
}
