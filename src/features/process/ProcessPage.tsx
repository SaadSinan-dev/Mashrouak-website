import {CmsText,CmsCopy} from '../content/Editable';
import { ArrowUpLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { CMSPage } from '../content/CMSPage';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
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
  return <CMSPage slug="process">
    <section className="page-hero page-hero--dark process-hero"><Container className="page-hero__layout"><Reveal><p className="eyebrow eyebrow--light"><CmsText k="process.pageEyebrow"/></p><h1><CmsText k="process.pageTitle"/><br /><span><CmsText k="process.pageEmphasis"/></span></h1></Reveal><Reveal delay={0.12}><div className="page-hero__aside"><p><CmsText k="process.pageDescription"/></p><span><CmsText k="process.stages"/></span></div></Reveal></Container></section>
    <section className="process-detail section-space"><Container><SectionHeading eyebrow={<CmsText k="process.journey"/>} title={<><CmsText k="process.journeyTitle"/><br /><span><CmsText k="process.journeyEmphasis"/></span></>} description={<CmsText k="process.journeyDescription"/>} /><div className="process-detail__steps">{Array.from({ length: 9 }, (_, index) => { const id = index + 1; return <Reveal key={id} delay={index * 0.05}><article className="process-detail__step"><div className="process-detail__step-number" dir="ltr">0{id}</div><div className="process-detail__step-main"><p className="eyebrow"><CmsText k={`step.${id}.subtitle` as TranslationKey}/></p><h2><CmsText k={`step.${id}.title` as TranslationKey}/></h2><p><CmsText k={`step.${id}.description` as TranslationKey}/></p></div><div className="process-detail__outputs"><h3><CmsText k="process.outputs"/></h3><ul>{t(`step.${id}.outputs` as TranslationKey).split('|').map((output) => <li key={output}><CheckCircle2 size={16} />{output}</li>)}</ul>{id === 1 && <Link className="text-link process-meeting-link" to="/contact"><CmsCopy copyKey="visual.ProcessPage.00114b666c" ar="اطلب اجتماعاً أولياً" en="Request an Initial Meeting"/> <Arrow size={16} /></Link>}</div></article></Reveal>; })}</div></Container></section>
    <section className="process-collaboration section-space"><Container className="process-collaboration__layout"><div><p className="eyebrow"><CmsText k="process.collaboration"/></p><h2><CmsText k="process.collaborationTitle"/><br /><span><CmsText k="process.collaborationEmphasis"/></span></h2></div><div><p><CmsText k="process.collaborationText"/></p><Link to="/contact" className="text-link"><CmsText k="process.startDiscussion"/> <Arrow size={17} /></Link></div></Container></section>
    <CTASection />
  </CMSPage>;
}
