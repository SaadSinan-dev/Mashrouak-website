import { describe, expect, it } from 'vitest';
import { buildInquiryMessage, buildMailtoUrl, buildWhatsAppUrl } from '../src/lib/contact';
import type { ProjectInquiry } from '../src/types/content';

const inquiry: ProjectInquiry = {
  fullName: 'Nour Ali',
  businessName: 'Studio Nour',
  email: 'nour@example.com',
  serviceType: 'websites',
  projectDescription: 'موقع تعريفي لخدمات الاستوديو مع صفحة تواصل.',
};

describe('contact message builders', () => {
  it('includes the submitted project details in the message', () => {
    const message = buildInquiryMessage(inquiry);
    expect(message).toContain('nour@example.com');
    expect(message).toContain('موقع تعريفي');
  });

  it('builds a natural English enquiry message when English is selected', () => {
    const message = buildInquiryMessage(inquiry, 'en');
    expect(message).toContain('New project enquiry');
    expect(message).toContain('Website Design & Development');
    expect(message).toContain('Project description');
  });

  it('creates a properly encoded mailto URL', () => {
    const url = buildMailtoUrl('hello@example.com', inquiry);
    expect(url.startsWith('mailto:hello@example.com?')).toBe(true);
    expect(url).toContain('subject=');
    expect(url).toContain('body=');
  });

  it('creates an English WhatsApp message when English is selected', () => {
    const url = buildWhatsAppUrl('31612345678', inquiry, 'en');
    expect(decodeURIComponent(url)).toContain('New project enquiry');
  });

  it('creates a WhatsApp URL with the number and message', () => {
    const url = buildWhatsAppUrl('31612345678', inquiry);
    expect(url.startsWith('https://wa.me/31612345678?text=')).toBe(true);
  });
});
