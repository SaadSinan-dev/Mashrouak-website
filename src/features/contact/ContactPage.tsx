import {CmsText,CmsCopy} from '../content/Editable';
import { BusyInline } from '../../../shared/ui/ResourceError';
import { CMSPage } from '../content/CMSPage';
import { useServices } from '../../app/providers/content-context';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUpLeft, ArrowUpRight, CheckCircle2, CircleAlert, Instagram, Mail, MessageCircle } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useLocale } from '../../app/providers/preferences-context';
import { siteConfig } from '../../config/site';
import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Reveal } from '../../components/shared/Reveal';
import { useSEO } from '../../lib/seo';
import { submitProjectInquiry } from '../../lib/contact';
import { createContactSchema, type ContactFormValues } from './schemas/contactSchema';
import { useSettings } from '../../app/providers/content-context';

type SubmissionState = 'idle' | 'loading' | 'success' | 'draft-email' | 'draft-whatsapp' | 'unconfigured' | 'error';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t, language, isArabic } = useLocale();
  const settings = useSettings();
  const contact = settings ?? siteConfig.contact;
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const services = useServices(language);
  const whatsappDisplay = `+${contact.whatsapp}`.replace(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/, '+$1 $2 $3 $4');
  const requestedService = searchParams.get('service') ?? '';
  const defaultService = services.some((service) => service.id === requestedService) ? requestedService : '';
  const routePrefill = (location.state as { prefill?: Partial<ContactFormValues> } | null)?.prefill;
  const prefill = routePrefill ?? {};
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [submissionMessage, setSubmissionMessage] = useState('');
  const timelineOptions = [
    { value: '', label: t('contact.timelinePlaceholder') },
    { value: 'asap', label: t('contact.timeline.soon') },
    { value: 'within-one-month', label: t('contact.timeline.month') },
    { value: 'within-two-to-three-months', label: t('contact.timeline.quarter') },
    { value: 'flexible', label: t('contact.timeline.flexible') },
  ];

  useSEO({ title: t('nav.contact'), description: t('contact.description'), path: '/contact' });
  const { register, handleSubmit, formState: { errors }, reset, clearErrors } = useForm<ContactFormValues>({
    resolver: zodResolver(createContactSchema(language, services.map(service=>service.id))),
    defaultValues: { fullName: prefill.fullName ?? '', businessName: prefill.businessName ?? '', email: prefill.email ?? '', serviceType: prefill.serviceType ?? defaultService, projectDescription: prefill.projectDescription ?? '', budget: prefill.budget ?? '', timeline: prefill.timeline ?? '', additionalDetails: prefill.additionalDetails ?? '' },
  });

  useEffect(() => { clearErrors(); }, [clearErrors, language]);
  useEffect(() => {
    if (!routePrefill) return;
    reset({ fullName: routePrefill.fullName ?? '', businessName: routePrefill.businessName ?? '', email: routePrefill.email ?? '', serviceType: routePrefill.serviceType ?? defaultService, projectDescription: routePrefill.projectDescription ?? '', budget: routePrefill.budget ?? '', timeline: routePrefill.timeline ?? '', additionalDetails: routePrefill.additionalDetails ?? '' });
  }, [defaultService, location.key, location.state, reset, routePrefill]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionState('loading');
    setSubmissionMessage('');
    try {
      const result = await submitProjectInquiry(values, language);
      if (result.kind === 'sent') {
        setSubmissionState('success');
        setSubmissionMessage('');
        toast.success(t('contact.sent'));
        reset({ fullName: '', businessName: '', email: '', serviceType: '', projectDescription: '', budget: '', timeline: '', additionalDetails: '' });
      } else if (result.kind === 'draft') {
        setSubmissionState(result.channel === 'email' ? 'draft-email' : 'draft-whatsapp');
        setSubmissionMessage('');
      } else {
        setSubmissionState('unconfigured');
        setSubmissionMessage('');
      }
    } catch {
      const message = t('contact.sendError');
      setSubmissionState('error');
      setSubmissionMessage(message);
      toast.error(t('contact.errorTitle'));
    }
  });

  const feedbackMessage = submissionState === 'success' ? t('contact.success')
    : submissionState === 'draft-email' ? t('contact.draftEmail')
      : submissionState === 'draft-whatsapp' ? t('contact.draftWhatsapp')
        : submissionState === 'unconfigured' ? t('contact.unconfigured')
          : submissionMessage;

  return <CMSPage slug="contact">
    <section className="page-hero page-hero--light contact-hero"><Container className="page-hero__layout"><Reveal><p className="eyebrow"><CmsText k="contact.eyebrow"/></p><h1><CmsText k="contact.title"/><br /><span><CmsText k="contact.emphasis"/></span></h1></Reveal><Reveal delay={0.12}><div className="page-hero__aside"><p><CmsText k="contact.description"/></p><span><CmsText k="contact.heroMeta"/></span></div></Reveal></Container></section>
    <section className="contact-channels"><Container><a href={`mailto:${contact.email}`}><span>01 / <CmsCopy copyKey="visual.ContactPage.06e2969958" ar="البريد الإلكتروني" en="EMAIL"/></span><Mail size={25} strokeWidth={1.4}/><h2><CmsCopy copyKey="visual.ContactPage.f4f02d919c" ar="أرسل التفاصيل" en="Put it in writing"/></h2><p><CmsCopy copyKey="visual.ContactPage.aea1b62c3c" ar="للأفكار والمرفقات والاستفسارات المفصّلة" en="For ideas, attachments and detailed enquiries"/></p><strong dir="ltr">{contact.email}</strong><Arrow size={18}/></a><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer"><span>02 / <CmsCopy copyKey="visual.ContactPage.ab679e3b29" ar="واتساب" en="WHATSAPP"/></span><MessageCircle size={25} strokeWidth={1.4}/><h2><CmsCopy copyKey="visual.ContactPage.855430da2c" ar="ابدأ الحديث" en="Start a conversation"/></h2><p><CmsCopy copyKey="visual.ContactPage.a27f1dd457" ar="تواصل معنا عبر حساب الشركة على واتساب" en="Reach the company through WhatsApp"/></p><strong dir="ltr">{whatsappDisplay}</strong><Arrow size={18}/></a><Link to="/contact/chat"><span>03 / <CmsCopy copyKey="visual.ContactPage.5be8eb11a7" ar="محادثة الدعم" en="LIVE CHAT"/></span><MessageCircle size={25} strokeWidth={1.4}/><h2><CmsCopy copyKey="visual.ContactPage.4efe0d53d4" ar="هنا، في مساحة خاصة" en="Here, in a private space"/></h2><p><CmsCopy copyKey="visual.ContactPage.030a34e454" ar="رسائل محفوظة وردود الفريق عند المراجعة" en="Saved messages and team replies after review"/></p><strong><CmsCopy copyKey="visual.ContactPage.d8c7cee84e" ar="افتح المحادثة" en="Open conversation"/></strong><Arrow size={18}/></Link></Container></section>
    <section className="contact-page section-space"><Container className="contact-page__layout">
      <Reveal className="contact-page__sidebar"><p className="eyebrow"><CmsText k="contact.before"/></p><h2><CmsText k="contact.startKnown"/><br /><span><CmsText k="contact.know"/></span></h2><p><CmsText k="contact.sidebarText"/></p>
        <div className="contact-note"><span><Mail size={18} /></span><div><strong><CmsText k="contact.email"/></strong><p dir="ltr"><a href={`mailto:${contact.email}`}><bdi>{contact.email}</bdi></a></p></div></div>
        <div className="contact-note"><span><MessageCircle size={18} /></span><div><strong><CmsText k="contact.whatsapp"/></strong><p dir="ltr"><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer"><bdi>{whatsappDisplay}</bdi></a></p></div></div>
        <div className="contact-note"><span><Instagram size={18} /></span><div><strong><CmsText k="contact.instagram"/></strong><p dir="ltr"><a href={contact.instagram} target="_blank" rel="noopener noreferrer"><bdi>@mashrouak_net</bdi></a></p></div></div>
        <span className="contact-page__sidebar-index"><CmsText k="contact.sidebarIndex"/></span>
      </Reveal>
      <Reveal delay={0.1} className="contact-form-wrap"><form className="contact-form" onSubmit={onSubmit} noValidate>
        <div className="contact-form__heading"><span>01 / <CmsText k="contact.formTag"/></span><h2><CmsText k="contact.formIndex"/></h2><p><CmsText k="contact.requiredNote"/></p></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="fullName"><CmsText k="contact.fullName"/> <span>*</span></label><input id="fullName" autoComplete="name" placeholder={t('contact.fullNamePlaceholder')} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} {...register('fullName')} />{errors.fullName && <small id="fullName-error" className="form-error">{errors.fullName.message}</small>}</div>
          <div className="form-field"><label htmlFor="businessName"><CmsText k="contact.businessName"/></label><input id="businessName" autoComplete="organization" placeholder={t('contact.businessPlaceholder')} {...register('businessName')} /></div>
          <div className="form-field"><label htmlFor="email"><CmsText k="contact.emailLabel"/> <span>*</span></label><input id="email" type="email" autoComplete="email" placeholder="name@example.com" dir="ltr" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />{errors.email && <small id="email-error" className="form-error">{errors.email.message}</small>}</div>
          <div className="form-field"><label htmlFor="serviceType"><CmsText k="contact.service"/> <span>*</span></label><select id="serviceType" aria-invalid={Boolean(errors.serviceType)} aria-describedby={errors.serviceType ? 'serviceType-error' : undefined} {...register('serviceType')}><option value="">{t('contact.servicePlaceholder')}</option>{services.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select>{errors.serviceType && <small id="serviceType-error" className="form-error">{errors.serviceType.message}</small>}</div>
          <div className="form-field form-field--full"><label htmlFor="projectDescription"><CmsText k="contact.projectDescription"/> <span>*</span></label><textarea id="projectDescription" rows={5} placeholder={t('contact.projectPlaceholder')} aria-invalid={Boolean(errors.projectDescription)} aria-describedby={errors.projectDescription ? 'projectDescription-error' : undefined} {...register('projectDescription')} />{errors.projectDescription && <small id="projectDescription-error" className="form-error">{errors.projectDescription.message}</small>}</div>
          <div className="form-field"><label htmlFor="budget"><CmsText k="contact.budget"/></label><input id="budget" dir="auto" placeholder={t('contact.budgetPlaceholder')} {...register('budget')} /></div>
          <div className="form-field"><label htmlFor="timeline"><CmsText k="contact.timeline"/></label><select id="timeline" {...register('timeline')}>{timelineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="form-field form-field--full"><label htmlFor="additionalDetails"><CmsText k="contact.additional"/> <small><CmsText k="contact.optional"/></small></label><textarea id="additionalDetails" rows={3} placeholder={t('contact.additionalPlaceholder')} {...register('additionalDetails')} /></div>
        </div>
        <div className="contact-form__submit"><Button type="submit" size="lg" disabled={submissionState === 'loading'}>{submissionState === 'loading' ? <BusyInline label={t('contact.sending')}/> : <><CmsText k="contact.submit"/> <Arrow size={18} /></>}</Button><p><CmsCopy copyKey="visual.ContactPage.cebd59f460" ar="يُحفظ الطلب في صندوق الدعم عند الاتصال. إذا تعذّر ذلك، يُفتح بريد جاهز ترسله بنفسك" en="Connected enquiries are saved in the support inbox. If unavailable, a prepared email opens for you to send"/></p></div>
        {feedbackMessage && submissionState !== 'idle' && submissionState !== 'loading' && <div className={`form-feedback form-feedback--${submissionState}`} role="status" aria-live="polite">{submissionState === 'success' || submissionState.startsWith('draft') ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}<span>{feedbackMessage}</span></div>}
      </form></Reveal>
    </Container></section>
    <section className="contact-bottom"><Container><p><CmsText k="contact.bottomQuestion"/></p><span><CmsText k="contact.bottomText"/></span></Container></section>
  </CMSPage>;
}
