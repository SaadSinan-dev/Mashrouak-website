import { describe, expect, it } from 'vitest';
import { contactSchema, createContactSchema } from '../src/features/contact/schemas/contactSchema';

const validInquiry = {
  fullName: 'سارة محمد',
  businessName: 'متجر النخبة',
  email: 'sara@example.com',
  serviceType: 'ecommerce',
  projectDescription: 'أحتاج إلى متجر إلكتروني لإدارة المنتجات والطلبات.',
  budget: '2,000 – 5,000 دولار',
  timeline: 'خلال شهرين إلى ثلاثة',
  additionalDetails: '',
};

describe('contactSchema', () => {
  it('accepts a complete valid project inquiry', () => {
    expect(contactSchema.safeParse(validInquiry).success).toBe(true);
  });

  it('rejects an invalid email address', () => {
    const result = contactSchema.safeParse({ ...validInquiry, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('requires a meaningful project description', () => {
    const result = contactSchema.safeParse({ ...validInquiry, projectDescription: 'قصير' });
    expect(result.success).toBe(false);
  });

  it('provides validation feedback in the active English language', () => {
    const result = createContactSchema('en').safeParse({ ...validInquiry, fullName: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Please enter your full name');
  });
});
