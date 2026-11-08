import { describe, expect, it } from 'vitest';
import { siteConfig } from '../src/config/site';

const expectedEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim() || 'mashrouak.net@gmail.com';
const expectedWhatsApp = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '') || '963937254833';
const expectedInstagram = 'https://www.instagram.com/mashrouak_net/';

describe('owner-confirmed public contact channels', () => {
  it('uses the confirmed email, WhatsApp number, and Instagram profile by default', () => {
    expect(siteConfig.contact.email).toBe(expectedEmail);
    expect(siteConfig.contact.whatsapp).toBe(expectedWhatsApp);
    expect(siteConfig.contact.instagram).toBe(expectedInstagram);
  });

  it('exposes the same contact destinations in the shared social configuration', () => {
    expect(siteConfig.social).toEqual([
      { label: 'WhatsApp', url: `https://wa.me/${expectedWhatsApp}` },
      { label: 'Email', url: `mailto:${expectedEmail}` },
      { label: 'Instagram', url: expectedInstagram },
    ]);
  });
});
