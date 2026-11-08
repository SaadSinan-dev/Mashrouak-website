import { ArrowUpLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/PreferencesProvider';
import type { TranslationKey } from '../../locales/messages';
import { CTASection } from '../../components/shared/CTASection';
import { Reveal } from '../../components/shared/Reveal';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { useSEO } from '../../lib/seo';

export function ProcessPage() {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  useSEO({ title: t('nav.process'), description: t('process.pageDescription'), path: '/process' });
  return <>
    <section className="page-hero page-hero--dark process-hero"><Container className="page-hero__layout"><Reveal><p className="eyebrow eyebrow--light">{t('process.pageEyebrow')}</p><h1>{t('process.pageTitle')}<br /><span>{t('process.pageEmphasis')}</span></h1></Reveal><Reveal delay={0.12}><div className="page-hero__aside"><p>{t('process.pageDescription')}</p><span>{t('process.stages')}</span></div></Reveal></Container></section>
    <section className="process-detail section-space"><Container><SectionHeading eyebrow={t('process.journey')} title={<>{t('process.journeyTitle')}<br /><span>{t('process.journeyEmphasis')}</span></>} description={t('process.journeyDescription')} /><div className="process-detail__steps">{Array.from({ length: 9 }, (_, index) => { const id = index + 1; return <Reveal key={id} delay={index * 0.05}><article className="process-detail__step"><div className="process-detail__step-number" dir="ltr">0{id}</div><div className="process-detail__step-main"><p className="eyebrow">{t(`step.${id}.subtitle` as TranslationKey)}</p><h2>{t(`step.${id}.title` as TranslationKey)}</h2><p>{t(`step.${id}.description` as TranslationKey)}</p></div><div className="process-detail__outputs"><h3>{t('process.outputs')}</h3><ul>{t(`step.${id}.outputs` as TranslationKey).split('|').map((output) => <li key={output}><CheckCircle2 size={16} />{output}</li>)}</ul>{id === 1 && <Link className="text-link process-meeting-link" to="/contact">{isArabic ? 'اطلب اجتماعاً أولياً' : 'Request an Initial Meeting'} <Arrow size={16} /></Link>}</div></article></Reveal>; })}</div></Container></section>
    <section className="process-collaboration section-space"><Container className="process-collaboration__layout"><div><p className="eyebrow">{t('process.collaboration')}</p><h2>{t('process.collaborationTitle')}<br /><span>{t('process.collaborationEmphasis')}</span></h2></div><div><p>{t('process.collaborationText')}</p><Link to="/contact" className="text-link">{t('process.startDiscussion')} <Arrow size={17} /></Link></div></Container></section>
    <CTASection />
  </>;
}
