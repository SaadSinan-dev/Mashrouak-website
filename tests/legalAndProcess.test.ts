import { describe, expect, it } from 'vitest';
import { termsContent } from '../src/features/legal/termsContent';
import { messages } from '../src/locales/messages';

describe('project journey and legal content', () => {
  it('contains nine complete bilingual project stages', () => {
    for (const language of ['ar', 'en'] as const) {
      for (let step = 1; step <= 9; step += 1) {
        expect(messages[language][`step.${step}.title` as keyof typeof messages.ar]).toBeTruthy();
        expect(messages[language][`step.${step}.description` as keyof typeof messages.ar]).toBeTruthy();
        expect(messages[language][`step.${step}.outputs` as keyof typeof messages.ar]).toBeTruthy();
      }
    }
    expect(messages.en['step.1.title']).toContain('Google Meet');
  });

  it('provides equivalent substantive terms sections in both languages', () => {
    expect(termsContent.ar).toHaveLength(38);
    expect(termsContent.en).toHaveLength(38);
    expect(termsContent.ar.every((section) => section.title.length > 4 && section.body.length > 80)).toBe(true);
    expect(termsContent.en.every((section) => section.title.length > 4 && section.body.length > 80)).toBe(true);
  });
});
