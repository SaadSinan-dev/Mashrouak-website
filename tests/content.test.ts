import { describe, expect, it } from 'vitest';
import { services } from '../src/data/services';

describe('site content', () => {
  it('contains all six service categories with unique ids', () => {
    expect(services).toHaveLength(6);
    expect(new Set(services.map((service) => service.id)).size).toBe(6);
  });

});
