import type { TranslationKey } from '../locales/messages';

export const mainNavigation: ReadonlyArray<{ key: Extract<TranslationKey, `nav.${string}`>; to: string }> = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.services', to: '/services' },
  { key: 'nav.work', to: '/work' },
  { key: 'nav.about', to: '/about' },
  { key: 'nav.process', to: '/process' },
  { key: 'nav.contact', to: '/contact' },
];

export const footerNavigation = mainNavigation;
