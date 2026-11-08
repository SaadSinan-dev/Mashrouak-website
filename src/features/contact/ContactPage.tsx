import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUpLeft, ArrowUpRight, CheckCircle2, CircleAlert, Instagram, LoaderCircle, Mail, MessageCircle } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { siteConfig } from '../../config/site';
import { getLocalizedServices } from '../../locales/content';
import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Reveal } from '../../components/shared/Reveal';
import { useSEO } from '../../lib/seo';
import { submitProjectInquiry } from '../../lib/contact';
import { createContactSchema, type ContactFormValues } from './schemas/contactSchema';

type SubmissionState = 'idle' | 'loading' | 'success' | 'draft-email' | 'draft-whatsapp' | 'unconfigured' | 'error';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t, language, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const services = getLocalizedServices(language);
  const whatsappDisplay = `+${siteConfig.contact.whatsapp}`.replace(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/, '+$1 $2 $3 $4');
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
    resolver: zodResolver(createContactSchema(language)),
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

  return <>
    <section className="page-hero page-hero--light contact-hero"><Container className="page-hero__layout"><Reveal><p className="eyebrow">{t('contact.eyebrow')}</p><h1>{t('contact.title')}<br /><span>{t('contact.emphasis')}</span></h1></Reveal><Reveal delay={0.12}><div className="page-hero__aside"><p>{t('contact.description')}</p><span>{t('contact.heroMeta')}</span></div></Reveal></Container></section>
    <section className="contact-page section-space"><Container className="contact-page__layout">
      <Reveal className="contact-page__sidebar"><p className="eyebrow">{t('contact.before')}</p><h2>{t('contact.startKnown')}<br /><span>{t('contact.know')}</span></h2><p>{t('contact.sidebarText')}</p>
        <div className="contact-note"><span><Mail size={18} /></span><div><strong>{t('contact.email')}</strong><p dir="ltr"><a href={`mailto:${siteConfig.contact.email}`}><bdi>{siteConfig.contact.email}</bdi></a></p></div></div>
        <div className="contact-note"><span><MessageCircle size={18} /></span><div><strong>{t('contact.whatsapp')}</strong><p dir="ltr"><a href={`https://wa.me/${siteConfig.contact.whatsapp}`} target="_blank" rel="noopener noreferrer"><bdi>{whatsappDisplay}</bdi></a></p></div></div>
        <div className="contact-note"><span><Instagram size={18} /></span><div><strong>{t('contact.instagram')}</strong><p dir="ltr"><a href={siteConfig.contact.instagram} target="_blank" rel="noopener noreferrer"><bdi>@mashrouak_net</bdi></a></p></div></div>
        <span className="contact-page__sidebar-index">{t('contact.sidebarIndex')}</span>
      </Reveal>
      <Reveal delay={0.1} className="contact-form-wrap"><form className="contact-form" onSubmit={onSubmit} noValidate>
        <div className="contact-form__heading"><span>01 / {t('contact.formTag')}</span><h2>{t('contact.formIndex')}</h2><p>{t('contact.requiredNote')}</p></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="fullName">{t('contact.fullName')} <span>*</span></label><input id="fullName" autoComplete="name" placeholder={t('contact.fullNamePlaceholder')} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} {...register('fullName')} />{errors.fullName && <small id="fullName-error" className="form-error">{errors.fullName.message}</small>}</div>
          <div className="form-field"><label htmlFor="businessName">{t('contact.businessName')}</label><input id="businessName" autoComplete="organization" placeholder={t('contact.businessPlaceholder')} {...register('businessName')} /></div>
          <div className="form-field"><label htmlFor="email">{t('contact.emailLabel')} <span>*</span></label><input id="email" type="email" autoComplete="email" placeholder="name@example.com" dir="ltr" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />{errors.email && <small id="email-error" className="form-error">{errors.email.message}</small>}</div>
          <div className="form-field"><label htmlFor="serviceType">{t('contact.service')} <span>*</span></label><select id="serviceType" aria-invalid={Boolean(errors.serviceType)} aria-describedby={errors.serviceType ? 'serviceType-error' : undefined} {...register('serviceType')}><option value="">{t('contact.servicePlaceholder')}</option>{services.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select>{errors.serviceType && <small id="serviceType-error" className="form-error">{errors.serviceType.message}</small>}</div>
          <div className="form-field form-field--full"><label htmlFor="projectDescription">{t('contact.projectDescription')} <span>*</span></label><textarea id="projectDescription" rows={5} placeholder={t('contact.projectPlaceholder')} aria-invalid={Boolean(errors.projectDescription)} aria-describedby={errors.projectDescription ? 'projectDescription-error' : undefined} {...register('projectDescription')} />{errors.projectDescription && <small id="projectDescription-error" className="form-error">{errors.projectDescription.message}</small>}</div>
          <div className="form-field"><label htmlFor="budget">{t('contact.budget')}</label><input id="budget" dir="auto" placeholder={t('contact.budgetPlaceholder')} {...register('budget')} /></div>
          <div className="form-field"><label htmlFor="timeline">{t('contact.timeline')}</label><select id="timeline" {...register('timeline')}>{timelineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="form-field form-field--full"><label htmlFor="additionalDetails">{t('contact.additional')} <small>{t('contact.optional')}</small></label><textarea id="additionalDetails" rows={3} placeholder={t('contact.additionalPlaceholder')} {...register('additionalDetails')} /></div>
        </div>
        <div className="contact-form__submit"><Button type="submit" size="lg" disabled={submissionState === 'loading'}>{submissionState === 'loading' ? <><LoaderCircle className="spin" size={18} /> {t('contact.sending')}</> : <>{t('contact.submit')} <Arrow size={18} /></>}</Button><p>{t('contact.honesty')}</p></div>
        {feedbackMessage && submissionState !== 'idle' && submissionState !== 'loading' && <div className={`form-feedback form-feedback--${submissionState}`} role="status" aria-live="polite">{submissionState === 'success' || submissionState.startsWith('draft') ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}<span>{feedbackMessage}</span></div>}
      </form></Reveal>
    </Container></section>
    <section className="contact-bottom"><Container><p>{t('contact.bottomQuestion')}</p><span>{t('contact.bottomText')}</span></Container></section>
  </>;
}
