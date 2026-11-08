import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Service } from '../../types/content';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { ServiceIcon } from '../ui/ServiceIcon';

interface ServiceCardProps { service: Service; compact?: boolean; }

export function ServiceCard({ service, compact = false }: ServiceCardProps) {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return (
    <article className={`service-card ${compact ? 'service-card--compact' : ''}`}>
      <div className="service-card__topline"><span className="service-card__number">{service.number}</span><span className="service-card__icon"><ServiceIcon name={service.icon} size={22} /></span></div>
      <div className="service-card__content"><p className="service-card__english">{t('service.cardTag')}</p><h3>{service.title}</h3><p>{service.summary}</p></div>
      <Link className="service-card__link" to={`/services#${service.id}`} aria-label={`${t('common.learnMore')}: ${service.title}`}><span>{t('common.learnMore')}</span><Arrow aria-hidden="true" size={17} /></Link>
    </article>
  );
}
