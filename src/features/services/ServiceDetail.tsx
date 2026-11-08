import { ArrowUpLeft, ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Service } from '../../types/content';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { Reveal } from '../../components/shared/Reveal';
import { ServiceIcon } from '../../components/ui/ServiceIcon';

function ServiceVisual({ service }: { service: Service }) {
  const { t } = useLocale();
  return (
    <div className="service-detail__visual" data-service={service.icon} aria-label={service.title}>
      <span className="service-detail__visual-index">{t('service.visualIndex')} / {service.number}</span>
      <div className="service-detail__visual-mark" aria-hidden="true"><ServiceIcon name={service.icon} size={42} /></div>
      <div className="service-detail__visual-copy"><span>{t('service.visualTag')}</span><strong>{service.number}</strong></div>
      <div className="service-detail__visual-rule" />
    </div>
  );
}

export function ServiceDetail({ service, reverse = false }: { service: Service; reverse?: boolean }) {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return <section className={`service-detail${reverse ? ' service-detail--reverse' : ''}`} id={service.id}>
    <ServiceVisual service={service} />
    <Reveal className="service-detail__content"><p className="eyebrow">{t('service.detailEyebrow')} {service.number}</p><h2>{service.title}</h2><p className="service-detail__summary">{service.summary}</p><p className="service-detail__value">{service.businessValue}</p>
      <div className="service-detail__columns"><div><h3>{t('service.includes')}</h3><ul>{service.includes.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul></div><div><h3>{t('service.deliverables')}</h3><ul>{service.deliverables.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul></div></div>
      <p className="service-detail__fit"><strong>{t('service.suitable')}</strong> {service.suitableFor}</p><Link className="text-link" to={`/contact?service=${service.id}`}>{t('service.discuss')} <Arrow size={17} /></Link>
    </Reveal>
  </section>;
}
