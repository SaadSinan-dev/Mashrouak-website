import { useLocale } from '../../../app/providers/PreferencesProvider';
import type { TranslationKey } from '../../../locales/messages';
import { Accordion } from '../../../components/ui/Accordion';
import { faqIds } from '../../../data/faqs';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';

export function FAQSection() {
  const { t } = useLocale();
  const items = faqIds.map((id) => ({ value: `faq-${id}`, question: t(`faq.${id}.question` as TranslationKey), answer: t(`faq.${id}.answer` as TranslationKey) }));
  return <section className="faq-section section-space"><Container className="faq-section__layout"><Reveal><SectionHeading eyebrow={t('faq.eyebrow')} title={<>{t('faq.title')}<br /><span>{t('faq.emphasis')}</span></>} description={t('faq.description')} /></Reveal><Reveal delay={0.12}><Accordion items={items} /></Reveal></Container></section>;
}
