import {CmsText} from '../../content/Editable';
import { useServices } from '../../../app/providers/content-context';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../../app/providers/preferences-context';
import { ServiceCard } from '../../../components/shared/ServiceCard';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';

export function ServicesSection() {
  const { language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const services = useServices(language);
  return (
    <section className="services-section section-space" id="services">
      <Container>
        <div className="services-section__heading">
          <Reveal><SectionHeading eyebrow={<CmsText k="services.eyebrow"/>} title={<><CmsText k="services.title"/><br /><span><CmsText k="services.emphasis"/></span></>} description={<CmsText k="services.description"/>} /></Reveal>
          <Reveal delay={0.12}><Link className="text-link" to="/services"><CmsText k="services.all"/> <Arrow size={17} /></Link></Reveal>
        </div>
        <div className="services-grid">{services.map((service, index) => <Reveal key={service.id} delay={(index % 2) * 0.08}><ServiceCard service={service} compact={index > 1} /></Reveal>)}</div>
      </Container>
    </section>
  );
}
