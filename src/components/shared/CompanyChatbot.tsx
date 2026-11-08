import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, X, Send, MessageCircle, BriefcaseBusiness, Workflow, Layers3, ArrowUpRight, Instagram, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getLocalizedServices } from '../../locales/content';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { siteConfig } from '../../config/site';

type Message = { from: 'assistant' | 'visitor'; text: string };
export function CompanyChatbot() {
  const { language, direction } = useLocale();
  const ar = language === 'ar';
  const navigate = useNavigate();
  const services = getLocalizedServices(language);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiry, setInquiry] = useState({ fullName: '', email: '', serviceType: '', projectDescription: '', preferredContact: 'email' });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inquiryNameRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const previousOpenRef = useRef(false);
  const copy = ar ? {
    title: 'مساعد مشروعك.net', subtitle: 'مساعد معلوماتي للخدمات ورحلة العمل',
    welcome: 'مرحباً! أنا مساعد مشروعك.net يمكنني توضيح خدماتنا ومراحل تنفيذ المشاريع ومساعدتك في الوصول إلى صفحة التواصل',
    placeholder: 'اكتب سؤالك هنا…', send: 'إرسال', close: 'إغلاق المحادثة',
    suggestions: ['ما الخدمات التي تقدمونها؟','كيف تبدأ رحلة العمل؟','كيف أطلب اجتماعاً أولياً؟','ما المشاريع التي نفذتموها؟'],
    services: 'نقدم تصميم وتطوير المواقع والمتاجر الإلكترونية وتطبيقات الموبايل وتطبيقات الويب والأنظمة المخصصة والتكاملات الرقمية يمكنك استعراض التفاصيل في صفحة الخدمات',
    process: 'تبدأ الرحلة باجتماع تعارف أولي عبر Google Meet، ثم جمع المتطلبات وتوثيقها، والتخطيط والنطاق، والعرض والاتفاق، والتصميم، والتطوير، والاختبار، ثم الإطلاق والتسليم والدعم وفق الاتفاق',
    meeting: 'لطلب اجتماع أولي، تواصل معنا عبر واتساب أو البريد الإلكتروني سنراجع تفاصيل مشروعك ونتواصل معك لتأكيد موعد Google Meet وطريقة الانضمام لا يوجد رابط حجز تلقائي؛ يتم تأكيد الموعد بعد مراجعة الطلب',
    work: 'يمكنك الاطلاع على المشاريع المعروضة ودراسات الحالة من صفحة أعمالنا ولأي تفاصيل غير منشورة عن مشروع معين، أرسل استفسارك إلى الفريق',
    fallback: 'لا تتوفر لدي معلومة مؤكدة عن ذلك أرسل تفاصيل سؤالك عبر صفحة التواصل ليتم مراجعته من الفريق',
    quick: 'اختر موضوعاً أو اكتب سؤالك هذه إجابات إرشادية معدّة من معلومات الموقع وليست محادثة ذكاء اصطناعي مباشرة', inquiry: 'ابدأ استفسار مشروع', inquiryName: 'الاسم الكامل', inquiryEmail: 'البريد الإلكتروني', inquiryService: 'نوع المشروع', inquiryDescription: 'نبذة مختصرة عن المشروع', inquiryContact: 'طريقة التواصل المفضلة', inquiryContinue: 'متابعة إلى نموذج التواصل', inquiryCancel: 'العودة للمحادثة', inquiryEmailOption: 'البريد الإلكتروني', inquiryWhatsAppOption: 'واتساب', contactWhatsApp: 'تواصل عبر واتساب', contactEmail: 'راسلنا عبر البريد', contactInstagram: 'زيارة حساب إنستغرام', exploreServices: 'استكشف خدماتنا', workLabel: 'الأعمال'
  } : {
    title: 'Mashrouak.net Assistant', subtitle: 'Service and project journey guide',
    welcome: 'Hello! I’m the Mashrouak.net assistant I can explain our services and project workflow, and help you find the right contact page',
    placeholder: 'Type your question…', send: 'Send', close: 'Close chat',
    suggestions: ['What services do you offer?','How does the project journey work?','How can I request an initial meeting?','Can I see your work?'],
    services: 'We design and develop websites, e-commerce stores, mobile apps, web applications, custom business systems, and digital integrations Explore the Services page for details',
    process: 'The journey starts with an introductory Google Meet, followed by requirements gathering, technical planning and scope, proposal and agreement, UI/UX design, development reviews, QA, and launch and handover with support as agreed',
    meeting: 'To request an initial meeting, contact us through WhatsApp or email We will review your project details and follow up to confirm a Google Meet time and joining information There is no automatic booking link; the meeting is confirmed after your enquiry is reviewed',
    work: 'Explore the portfolio and case studies on the Work page For details about a project that are not published, send an enquiry to the team',
    fallback: 'I don’t have confirmed information about that Please send your question through the Contact page so the team can review it',
    quick: 'Choose a topic or type a question These are curated answers based on the website, not a live AI conversation', inquiry: 'Start a project enquiry', inquiryName: 'Full name', inquiryEmail: 'Email address', inquiryService: 'Project type', inquiryDescription: 'Brief project description', inquiryContact: 'Preferred contact method', inquiryContinue: 'Continue to contact form', inquiryCancel: 'Back to chat', inquiryEmailOption: 'Email', inquiryWhatsAppOption: 'WhatsApp', contactWhatsApp: 'Contact us on WhatsApp', contactEmail: 'Email us', contactInstagram: 'Visit Instagram', exploreServices: 'Explore our services', workLabel: 'Work'
  };
  const reply = (question: string) => {
    const q = question.toLocaleLowerCase();
    if (/service|خدم|ماذا تقدم|تقدمون/.test(q)) return copy.services;
    if (/process|journey|work flow|رحلة|مراحل|كيف تبدأ/.test(q)) return copy.process;
    if (/meet|meeting|consult|اجتماع|استشار/.test(q)) return copy.meeting;
    if (/portfolio|work|project|أعمال|مشاريع|مشروع/.test(q)) return copy.work;
    return copy.fallback;
  };
  const send = (value = input) => {
    const text = value.trim();
    if (!text) return;
    setMessages((current) => [...current, { from: 'visitor', text }, { from: 'assistant', text: reply(text) }]);
    setInput('');
  };
  const continueInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const preferredLabel = inquiry.preferredContact === 'whatsapp' ? copy.inquiryWhatsAppOption : copy.inquiryEmailOption;
    navigate('/contact', { state: { prefill: {
      fullName: inquiry.fullName.trim(),
      email: inquiry.email.trim(),
      serviceType: inquiry.serviceType,
      projectDescription: inquiry.projectDescription.trim(),
      additionalDetails: `${copy.inquiryContact}: ${preferredLabel}`,
    } } });
    setOpen(false);
    setInquiryOpen(false);
  };
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) { if (inquiryOpen) inquiryNameRef.current?.focus(); else inputRef.current?.focus(); } else if (previousOpenRef.current) launcherRef.current?.focus(); previousOpenRef.current = open; }, [open, inquiryOpen]);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open]);
  return <div className="company-chatbot" dir={direction}>
    {open && <section id="company-chatbot-panel" className="company-chatbot__panel" role="dialog" aria-modal="false" aria-label={copy.title}>
      <header className="company-chatbot__header"><span className="company-chatbot__avatar"><Bot size={20}/></span><span><strong>{copy.title}</strong><small>{copy.subtitle}</small></span><button type="button" onClick={() => setOpen(false)} aria-label={copy.close}><X size={19}/></button></header>
      <div className="company-chatbot__messages" aria-live="polite">
        <p className="company-chatbot__notice">{copy.quick}</p>
        <div className="company-chatbot__bubble company-chatbot__bubble--assistant">{copy.welcome}</div>
        {messages.map((message,index) => <div key={index} className={`company-chatbot__bubble company-chatbot__bubble--${message.from}`}>{message.text}</div>)}
        <div ref={endRef}/>
      </div>
      {inquiryOpen ? <form className="company-chatbot__inquiry-form" onSubmit={continueInquiry}>
        <h3>{copy.inquiry}</h3>
        <label>{copy.inquiryName}<input ref={inquiryNameRef} autoComplete="name" required value={inquiry.fullName} onChange={(event)=>setInquiry((current)=>({...current,fullName:event.target.value}))}/></label>
        <label>{copy.inquiryEmail}<input type="email" autoComplete="email" dir="ltr" required value={inquiry.email} onChange={(event)=>setInquiry((current)=>({...current,email:event.target.value}))}/></label>
        <label>{copy.inquiryService}<select required value={inquiry.serviceType} onChange={(event)=>setInquiry((current)=>({...current,serviceType:event.target.value}))}><option value="">{ar?'اختر الخدمة':'Select a service'}</option>{services.map((service)=><option key={service.id} value={service.id}>{service.title}</option>)}</select></label>
        <label>{copy.inquiryDescription}<textarea required rows={3} value={inquiry.projectDescription} onChange={(event)=>setInquiry((current)=>({...current,projectDescription:event.target.value}))}/></label>
        <label>{copy.inquiryContact}<select value={inquiry.preferredContact} onChange={(event)=>setInquiry((current)=>({...current,preferredContact:event.target.value}))}><option value="email">{copy.inquiryEmailOption}</option><option value="whatsapp">{copy.inquiryWhatsAppOption}</option></select></label>
        <button type="submit">{copy.inquiryContinue} <ArrowUpRight size={15}/></button>
        <button type="button" className="company-chatbot__inquiry-cancel" onClick={()=>setInquiryOpen(false)}>{copy.inquiryCancel}</button>
      </form> : <>
        <div className="company-chatbot__suggestions">{copy.suggestions.map((item,index) => { const Icon=[Layers3,Workflow,BriefcaseBusiness,ArrowUpRight][index] ?? MessageCircle; return <button type="button" key={item} onClick={()=>send(item)}><Icon size={14}/>{item}</button>; })}</div>
        <form className="company-chatbot__form" onSubmit={(event)=>{event.preventDefault();send();}}><label className="sr-only" htmlFor="company-chat-input">{copy.placeholder}</label><input ref={inputRef} id="company-chat-input" value={input} onChange={(event)=>setInput(event.target.value)} placeholder={copy.placeholder}/><button type="submit" aria-label={copy.send} disabled={!input.trim()}><Send size={17}/></button></form>
      </>}
      <nav className="company-chatbot__actions" aria-label={ar ? 'روابط التواصل والخدمات' : 'Contact and service links'}>
        <a href={`https://wa.me/${siteConfig.contact.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} />{copy.contactWhatsApp}</a>
        <a href={`mailto:${siteConfig.contact.email}`}><Mail size={14} />{copy.contactEmail}</a>
        <a href={siteConfig.contact.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={14} />{copy.contactInstagram}</a>
        <Link to="/services" onClick={()=>setOpen(false)}><Layers3 size={14} />{copy.exploreServices}</Link>
        <button type="button" onClick={()=>setInquiryOpen(true)}><BriefcaseBusiness size={14} />{ar ? 'ابدأ مشروعك' : 'Discuss your project'}</button>
        <Link to="/work" onClick={()=>setOpen(false)}><ArrowUpRight size={14} />{copy.workLabel}</Link>
      </nav><p className="company-chatbot__disclaimer">{ar ? 'مساعد أسئلة شائعة — لا يستخدم نموذج ذكاء اصطناعي مباشر' : 'Curated FAQ assistant — not a live AI model'}</p>
    </section>}
    <button ref={launcherRef} className="company-chatbot__launcher" type="button" aria-controls="company-chatbot-panel" onClick={()=>setOpen((v)=>!v)} aria-expanded={open} aria-label={open?copy.close:copy.title}>{open?<X size={22}/>:<MessageCircle size={23}/>}</button>
  </div>;
}
