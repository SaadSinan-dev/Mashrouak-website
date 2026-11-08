import { ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { getLocalizedServices } from '../../locales/content';
import { CTASection } from '../../components/shared/CTASection';
import { Reveal } from '../../components/shared/Reveal';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { useSEO } from '../../lib/seo';
import { ServiceDetail } from './ServiceDetail';

export function ServicesPage() {
  const { t, language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowDownLeft : ArrowDownRight;
  const services = getLocalizedServices(language);
  useSEO({ title: t('nav.services'), description: t('service.heroDescription'), path: '/services' });

  return <>
    <section className="page-hero page-hero--light"><Container className="page-hero__layout">
      <Reveal><p className="eyebrow">{t('service.heroEyebrow')}</p><h1>{t('service.heroTitle')}<br /><span>{t('service.heroEmphasis')}</span></h1></Reveal>
      <Reveal delay={0.12}><div className="page-hero__aside"><p>{t('service.heroDescription')}</p><Link to="#service-list" className="text-link">{t('service.browse')} <Arrow size={17} /></Link><span>{t('service.pageMeta')}</span></div></Reveal>
    </Container></section>
    <section className="services-overview section-space" id="service-list"><Container>
      <SectionHeading eyebrow={t('service.overviewEyebrow')} title={<>{t('service.overviewTitle')}<br /><span>{t('service.overviewEmphasis')}</span></>} description={t('service.overviewDescription')} />
      <div className="services-overview__list">{services.map((service, index) => <ServiceDetail key={service.id} service={service} reverse={index % 2 === 1} />)}</div>
    </Container></section>
    <section className="service-fit-section section-space"><Container className="service-fit-section__layout"><div><p className="eyebrow">{t('service.fitEyebrow')}</p><h2>{t('service.fitTitle')}<br /><span>{t('service.fitEmphasis')}</span></h2></div><p>{t('service.fitText')}</p></Container></section>
    <CTASection />
  </>;
}
