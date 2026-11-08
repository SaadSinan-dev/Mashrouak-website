import { siteConfig } from '../config/site';
import { getLocalizedServices } from '../locales/content';
import { messages, type Language } from '../locales/messages';
import type { ProjectInquiry } from '../types/content';

export type ContactSubmissionResult =
  | { kind: 'sent' }
  | { kind: 'draft'; channel: 'email' | 'whatsapp' }
  | { kind: 'unconfigured' };

export function buildInquiryMessage(inquiry: ProjectInquiry, language: Language = 'ar'): string {
  const t = messages[language];
  const service = getLocalizedServices(language).find((item) => item.id === inquiry.serviceType)?.title ?? inquiry.serviceType;
  return [
    t['contact.email.heading'],
    '',
    `${t['contact.fullName']}: ${inquiry.fullName}`,
    `${t['contact.businessName']}: ${inquiry.businessName || t['contact.notSpecified']}`,
    `${t['contact.emailLabel']}: ${inquiry.email}`,
    `${t['contact.service']}: ${service}`,
    `${t['contact.projectDescription']}: ${inquiry.projectDescription}`,
    `${t['contact.budget']}: ${inquiry.budget || t['contact.notSpecified']}`,
    `${t['contact.timeline']}: ${inquiry.timeline || t['contact.notSpecified']}`,
    `${t['contact.additional']}: ${inquiry.additionalDetails || t['contact.noAdditional']}`,
  ].join('\n');
}

export function buildMailtoUrl(email: string, inquiry: ProjectInquiry, language: Language = 'ar'): string {
  const subject = encodeURIComponent(`${messages[language]['contact.email.subject']} — ${inquiry.fullName}`);
  const body = encodeURIComponent(buildInquiryMessage(inquiry, language));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function buildWhatsAppUrl(number: string, inquiry: ProjectInquiry, language: Language = 'ar'): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(buildInquiryMessage(inquiry, language))}`;
}

export async function submitProjectInquiry(inquiry: ProjectInquiry, language: Language = 'ar'): Promise<ContactSubmissionResult> {
  const { apiUrl, email, whatsapp } = siteConfig.contact;

  if (apiUrl) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(inquiry),
    });
    if (!response.ok) throw new Error(messages[language]['contact.sendError']);
    return { kind: 'sent' };
  }

  if (email) {
    window.location.assign(buildMailtoUrl(email, inquiry, language));
    return { kind: 'draft', channel: 'email' };
  }

  if (whatsapp) {
    window.location.assign(buildWhatsAppUrl(whatsapp, inquiry, language));
    return { kind: 'draft', channel: 'whatsapp' };
  }

  return { kind: 'unconfigured' };
}
