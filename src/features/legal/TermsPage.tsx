import { useLocale } from '../../app/providers/PreferencesProvider';
import { Container } from '../../components/ui/Container';
import { termsContent } from './termsContent';
import { useSEO } from '../../lib/seo';

export function TermsPage() {
  const { language } = useLocale();
  const sections = termsContent[language];
  useSEO({ title: language === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions', description: language === 'ar' ? 'الشروط المنظمة لاستخدام موقع مشروعك.net والتعامل مع خدمات تطوير المنتجات الرقمية' : 'Terms governing use of the Mashrouak.net website and engagement with its digital product development services', path: '/terms' });
  return <section className="privacy-page legal-page section-space">
    <Container>
      <p className="eyebrow">{language === 'ar' ? 'المعلومات القانونية / 01' : 'Legal information / 01'}</p>
      <h1>{language === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}</h1>
      <p className="privacy-page__lead">{language === 'ar' ? 'توضح هذه الشروط إطار استخدام الموقع والتعامل الأولي مع خدمات مشروعك.net وتظل تفاصيل كل مشروع خاضعة للعرض والاتفاق المكتوب الخاص به' : 'These terms explain the framework for using the website and engaging with Mashrouak.net Project-specific details remain subject to the applicable written proposal and agreement'}</p>
      <p className="legal-page__review-note">{language === 'ar' ? 'ملاحظة للمالك: يلزم استكمال بيانات الكيان القانوني والولاية القضائية بعد التحقق منها ومراجعة هذه الوثيقة قانونياً قبل اعتمادها نهائياً' : 'Owner note: confirm the legal entity details and jurisdiction, and obtain legal review before adopting this document as final binding terms'}</p>
      <div className="privacy-page__body legal-page__sections">
        {sections.map((section, index) => <section key={section.title} className="legal-section"><span className="legal-section__number" dir="ltr">{String(index + 1).padStart(2, '0')}</span><div><h2>{section.title}</h2><p>{section.body}</p></div></section>)}
      </div>
      <p className="privacy-page__updated">{language === 'ar' ? 'آخر مراجعة تحريرية: نوفمبر 2026' : 'Editorial review: November 2026'}</p>
    </Container>
  </section>;
}
