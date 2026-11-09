import {CmsText} from '../content/Editable';
import { useServices } from '../../app/providers/content-context';
import { CMSPage } from '../content/CMSPage';
import { ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { CTASection } from '../../components/shared/CTASection';
import { Reveal } from '../../components/shared/Reveal';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { useSEO } from '../../lib/seo';
import { ServiceDetail } from './ServiceDetail';

export function ServicesPage() {
  const { t, language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowDownLeft : ArrowDownRight;
  const services = useServices(language);
  useSEO({ title: t('nav.services'), description: t('service.heroDescription'), path: '/services' });

  return <CMSPage slug="services">
    <section className="page-hero page-hero--light"><Container className="page-hero__layout">
      <Reveal><p className="eyebrow"><CmsText k="service.heroEyebrow"/></p><h1><CmsText k="service.heroTitle"/><br /><span><CmsText k="service.heroEmphasis"/></span></h1></Reveal>
      <Reveal delay={0.12}><div className="page-hero__aside"><p><CmsText k="service.heroDescription"/></p><Link to="#service-list" className="text-link"><CmsText k="service.browse"/> <Arrow size={17} /></Link><span><CmsText k="service.pageMeta"/></span></div></Reveal>
    </Container></section>
    <section className="services-overview section-space" id="service-list"><Container>
      <SectionHeading eyebrow={<CmsText k="service.overviewEyebrow"/>} title={<><CmsText k="service.overviewTitle"/><br /><span><CmsText k="service.overviewEmphasis"/></span></>} description={<CmsText k="service.overviewDescription"/>} />
      <div className="services-overview__list">{services.map((service, index) => <ServiceDetail key={service.id} service={service} reverse={index % 2 === 1} />)}</div>
    </Container></section>
    <section className="service-fit-section section-space"><Container className="service-fit-section__layout"><div><p className="eyebrow"><CmsText k="service.fitEyebrow"/></p><h2><CmsText k="service.fitTitle"/><br /><span><CmsText k="service.fitEmphasis"/></span></h2></div><p><CmsText k="service.fitText"/></p></Container></section>
    <CTASection />
  </CMSPage>;
}
