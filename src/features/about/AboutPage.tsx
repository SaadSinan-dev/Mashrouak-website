import { ArrowUpLeft, ArrowUpRight, Compass, HeartHandshake, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/PreferencesProvider';
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
  return <>
    <section className="page-hero page-hero--light about-hero"><Container className="page-hero__layout">
      <Reveal><p className="eyebrow">{t('about.eyebrow')}</p><h1>{t('about.title')} <span className="about-hero__brand"><Logo width={isArabic ? 246 : 228} /></span><br /><span>{t('about.emphasis')}</span></h1></Reveal>
      <Reveal delay={0.12}><div className="page-hero__aside"><p>{t('about.description')}</p><span>{t('about.studioType')}</span><Link to="/contact" className="text-link">{t('about.link')} <Arrow size={17} /></Link></div></Reveal>
    </Container></section>
    <section className="about-statement section-space"><Container className="about-statement__layout"><div><p className="eyebrow">{t('about.philosophy')}</p><h2>{t('about.statementTitle')}<br />{t('about.statementLine')} <span>{t('about.need')}</span></h2></div><div><p>{t('about.statement1')}</p><p>{t('about.statement2')}</p></div></Container></section>
    <section className="about-values section-space"><Container><SectionHeading eyebrow={t('about.valuesEyebrow')} title={<>{t('about.valuesTitle')}<br /><span>{t('about.valuesEmphasis')}</span></>} description={t('about.valuesDescription')} /><div className="about-values__grid">{valueIcons.map((Icon, index) => <Reveal key={index} delay={index * 0.06}><article className="about-value"><div><span dir="ltr">0{index + 1}</span><Icon size={22} /></div><h3>{t(`about.value.${index + 1}.title` as TranslationKey)}</h3><p>{t(`about.value.${index + 1}.text` as TranslationKey)}</p></article></Reveal>)}</div></Container></section>
    <section className="about-commitment section-space"><Container><div className="about-commitment__panel"><p className="eyebrow eyebrow--light">{t('about.commitment')}</p><h2>{t('about.commitmentTitle')}<br /><span>{t('about.commitmentEmphasis')}</span><br />{t('about.commitmentLine')}</h2><p>{t('about.commitmentText')}</p><Link to="/process" className="text-link text-link--light">{t('about.commitmentLink')} <Arrow size={17} /></Link></div></Container></section>
    <CTASection />
  </>;
}
