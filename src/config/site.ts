const siteUrl = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');

const officialContact = {
  email: import.meta.env.VITE_CONTACT_EMAIL?.trim() || 'mashrouak.net@gmail.com',
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '') || '963937254833',
  instagram: 'https://www.instagram.com/mashrouak_net/',
} as const;

export const siteConfig = {
  name: 'مشروعك.net',
  legalName: 'مشروعك.net',
  descriptor: 'استوديو للمنتجات الرقمية والحلول البرمجية',
  description:
    'نصمّم ونطوّر مواقع ومتاجر وتطبيقات وأنظمة رقمية تساعد الأعمال على الوصول إلى عملائها وتنظيم عملياتها',
  descriptionEn:
    'We design and develop websites, online stores, applications, and digital systems that help businesses reach customers and organize operations',
  url: siteUrl,
  locale: 'ar_AR',
  language: 'ar',
  direction: 'rtl' as const,
  logo: {
    light: '/brand/logo-horizontal-colour.svg',
    dark: '/brand/logo-horizontal-ivory.svg',
    symbol: '/brand/symbol-colour.svg',
    favicon: '/brand/instagram-avatar.svg',
  },
  colors: {
    deepPetrol: '#142B3A',
    teal: '#0B625D',
    warmIvory: '#F6F4EE',
    softMist: '#E9EFEC',
    white: '#FFFFFF',
    steelGray: '#56636B',
  },
  contact: {
    apiUrl: import.meta.env.VITE_CONTACT_API_URL?.trim() ?? '',
    ...officialContact,
  },
  analyticsId: import.meta.env.VITE_ANALYTICS_ID?.trim() ?? '',
  social: [
    { label: 'WhatsApp', url: `https://wa.me/${officialContact.whatsapp}` },
    { label: 'Email', url: `mailto:${officialContact.email}` },
    { label: 'Instagram', url: officialContact.instagram },
  ] as const,
} as const;

export type SiteConfig = typeof siteConfig;
