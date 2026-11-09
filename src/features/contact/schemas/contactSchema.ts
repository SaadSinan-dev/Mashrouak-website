import { z } from 'zod';
import { services } from '../../../data/services';
import { messages, type Language } from '../../../locales/messages';

export function createContactSchema(language: Language, serviceIds = services.map(service=>service.id)) {
  const t = messages[language];
  return z.object({
    fullName: z.string().trim().min(2, t['validation.name']).max(100,t['validation.name']),
    businessName: z.string().trim().max(200,t['validation.name']).optional(),
    email: z.string().trim().email(t['validation.email']).max(254,t['validation.email']),
    serviceType: z.string().min(1, t['validation.service']).refine((value) => serviceIds.includes(value), t['validation.serviceOption']),
    projectDescription: z.string().trim().min(20, t['validation.description']).max(4000,t['validation.description']),
    budget: z.string().max(200,t['validation.description']).optional(),
    timeline: z.string().max(100,t['validation.description']).optional(),
    additionalDetails: z.string().trim().max(4000,t['validation.description']).optional(),
  });
}

export const contactSchema = createContactSchema('ar');
export type ContactFormValues = z.infer<typeof contactSchema>;
