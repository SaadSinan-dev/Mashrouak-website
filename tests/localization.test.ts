import { describe, expect, it } from 'vitest';
import { getLocalizedServices } from '../src/locales/content';
import { messages } from '../src/locales/messages';

describe('bilingual content system', () => {
  it('provides matching translation keys in Arabic and English', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.ar).sort());
    expect(Object.keys(messages.ar).length).toBeGreaterThan(300);
  });

  it('localizes all six service descriptions and deliverables', () => {
    const arabic = getLocalizedServices('ar');
    const english = getLocalizedServices('en');
    expect(arabic).toHaveLength(6);
    expect(english).toHaveLength(6);
    expect(english.every((service) => service.title.length > 0 && service.summary.length > 0 && service.includes.length > 0 && service.deliverables.length > 0)).toBe(true);
    expect(english[0]?.title).toBe('Website Design & Development');
    expect(arabic[0]?.title).toBe('تصميم وتطوير المواقع');
  });

});
