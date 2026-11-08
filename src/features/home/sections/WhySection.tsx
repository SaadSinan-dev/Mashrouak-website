import { Check, Compass, Layers3, MessageCircleMore, Ruler } from 'lucide-react';
import { useLocale, useTheme } from '../../../app/providers/PreferencesProvider';
import type { TranslationKey } from '../../../locales/messages';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';

const icons = [Compass, Ruler, MessageCircleMore, Layers3];

export function WhySection() {
  const { t } = useLocale();
  const { theme } = useTheme();
  return (
    <section className="why-section section-space"><Container className="why-section__layout">
      <Reveal><div className="why-section__statement"><p className="eyebrow">{t('why.eyebrow')}</p><h2>{t('why.title')} <span>{t('why.emphasis')}</span> {t('why.rest')}</h2><p>{t('why.description')}</p><span className="why-section__seal"><img src={theme === 'dark' ? '/brand/symbol-white.svg' : '/brand/symbol-colour.svg'} alt="" /><small>{t('why.seal').split('|')[0]}<br />{t('why.seal').split('|')[1]}</small></span></div></Reveal>
      <div className="why-principles">{icons.map((Icon, index) => <Reveal key={index} delay={index * 0.08}><article className="why-principle"><span className="why-principle__icon"><Icon size={21} strokeWidth={1.6} /></span><div><h3>{t(`why.${index + 1}.title` as TranslationKey)}</h3><p>{t(`why.${index + 1}.text` as TranslationKey)}</p></div><Check className="why-principle__check" size={17} aria-hidden="true" /></article></Reveal>)}</div>
    </Container></section>
  );
}
