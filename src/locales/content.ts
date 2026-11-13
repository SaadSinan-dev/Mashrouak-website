import { services } from '../data/services';
import { serviceTranslations, type Language } from './messages';

export function getLocalizedServices(language: Language) {
  return services.map((service, index) => ({ ...service, ...serviceTranslations[language][String(index + 1)]! }));
}

export function getLocalizedProjectCategories(language: Language) {
  if (language === 'en') return [
    { value: 'all', label: 'All work' },
    { value: 'web', label: 'Web platforms' },
    { value: 'commerce', label: 'E-commerce' },
    { value: 'mobile', label: 'Mobile apps' },
    { value: 'systems', label: 'Systems' },
  ] as const;
  return [
    { value: 'all', label: 'جميع الأعمال' },
    { value: 'web', label: 'منصات الويب' },
    { value: 'commerce', label: 'المتاجر الإلكترونية' },
    { value: 'mobile', label: 'تطبيقات الموبايل' },
    { value: 'systems', label: 'الأنظمة' },
  ] as const;
}
