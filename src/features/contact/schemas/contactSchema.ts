import { z } from 'zod';
import { services } from '../../../data/services';
import { messages, type Language } from '../../../locales/messages';

export function createContactSchema(language: Language) {
  const t = messages[language];
  return z.object({
    fullName: z.string().trim().min(2, t['validation.name']),
    businessName: z.string().trim().optional(),
    email: z.string().trim().email(t['validation.email']),
    serviceType: z.string().min(1, t['validation.service']).refine((value) => services.some((service) => service.id === value), t['validation.serviceOption']),
    projectDescription: z.string().trim().min(20, t['validation.description']),
    budget: z.string().optional(),
    timeline: z.string().optional(),
    additionalDetails: z.string().trim().optional(),
  });
}

export const contactSchema = createContactSchema('ar');
export type ContactFormValues = z.infer<typeof contactSchema>;
