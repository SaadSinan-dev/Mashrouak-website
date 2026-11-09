import {CmsText} from '../../content/Editable';
import { useLocale } from '../../../app/providers/preferences-context';
import type { TranslationKey } from '../../../locales/messages';
import { Accordion } from '../../../components/ui/Accordion';
import { faqIds } from '../../../data/faqs';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';

export function FAQSection() {
  const { t } = useLocale();
  const items = faqIds.map((id) => ({ value: `faq-${id}`, question: t(`faq.${id}.question` as TranslationKey), answer: t(`faq.${id}.answer` as TranslationKey) }));
  return <section className="faq-section section-space"><Container className="faq-section__layout"><Reveal><SectionHeading eyebrow={<CmsText k="faq.eyebrow"/>} title={<><CmsText k="faq.title"/><br /><span><CmsText k="faq.emphasis"/></span></>} description={<CmsText k="faq.description"/>} /></Reveal><Reveal delay={0.12}><Accordion items={items} /></Reveal></Container></section>;
}
