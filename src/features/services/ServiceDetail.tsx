import {CmsText,CmsValue} from '../content/Editable';
import { ArrowUpLeft, ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Service } from '../../types/content';
import { useLocale } from '../../app/providers/preferences-context';
import { Reveal } from '../../components/shared/Reveal';
import { ServiceIcon } from '../../components/ui/ServiceIcon';

function ServiceVisual({ service }: { service: Service }) {
  return (
    <div className="service-detail__visual" data-service={service.icon} aria-label={service.title}>
      <span className="service-detail__visual-index"><CmsText k="service.visualIndex"/> / {service.number}</span>
      <div className="service-detail__visual-mark" aria-hidden="true"><ServiceIcon name={service.icon} size={42} /></div>
      <div className="service-detail__visual-copy"><span><CmsText k="service.visualTag"/></span><strong>{service.number}</strong></div>
      <div className="service-detail__visual-rule" />
    </div>
  );
}

export function ServiceDetail({ service, reverse = false }: { service: Service; reverse?: boolean }) {
  const { isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return <section className={`service-detail${reverse ? ' service-detail--reverse' : ''}`} id={service.id}>
    <ServiceVisual service={service} />
    <Reveal className="service-detail__content"><p className="eyebrow"><CmsText k="service.detailEyebrow"/> {service.number}</p><h2><CmsValue kind="services" slug={service.id} path={['title']}>{service.title}</CmsValue></h2><p className="service-detail__summary"><CmsValue kind="services" slug={service.id} path={['summary']}>{service.summary}</CmsValue></p><p className="service-detail__value"><CmsValue kind="services" slug={service.id} path={['businessValue']}>{service.businessValue}</CmsValue></p>
      <div className="service-detail__columns"><div><h3><CmsText k="service.includes"/></h3><ul>{service.includes.map((item,index) => <li key={item}><Check size={15} /><CmsValue kind="services" slug={service.id} path={['includes',index]}>{item}</CmsValue></li>)}</ul></div><div><h3><CmsText k="service.deliverables"/></h3><ul>{service.deliverables.map((item,index) => <li key={item}><Check size={15} /><CmsValue kind="services" slug={service.id} path={['deliverables',index]}>{item}</CmsValue></li>)}</ul></div></div>
      <p className="service-detail__fit"><strong><CmsText k="service.suitable"/></strong> <CmsValue kind="services" slug={service.id} path={['suitableFor']}>{service.suitableFor}</CmsValue></p><Link className="text-link" to={`/contact?service=${service.id}`}><CmsText k="service.discuss"/> <Arrow size={17} /></Link>
    </Reveal>
  </section>;
}
