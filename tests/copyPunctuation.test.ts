import { describe, expect, it } from 'vitest';
import { messages } from '../src/locales/messages';

describe('bilingual interface copy', () => {
  it('does not add unnecessary sentence-final full stops to localized UI strings', () => {
    for (const language of Object.values(messages)) {
      for (const [key, value] of Object.entries(language)) {
        expect(value.endsWith('.'), `${key} should not end with a full stop`).toBe(false);
      }
    }
  });
});
