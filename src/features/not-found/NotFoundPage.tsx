import { ArrowUpLeft, ArrowUpRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { Container } from '../../components/ui/Container';
import { ButtonLink } from '../../components/ui/Button';
import { useSEO } from '../../lib/seo';

export function NotFoundPage() {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  useSEO({ title: t('notFound.eyebrow'), description: t('notFound.description'), noIndex: true });
  return <section className="not-found-page"><Container><span className="not-found-page__icon"><Compass size={30} /></span><p className="eyebrow">{t('notFound.eyebrow')}</p><h1>{t('notFound.title')}<br /><span>{t('notFound.emphasis')}</span></h1><p>{t('notFound.description')}</p><div><ButtonLink to="/">{t('common.backHome')} <Arrow size={18} /></ButtonLink><Link to="/services">{t('notFound.services')}</Link></div></Container></section>;
}
