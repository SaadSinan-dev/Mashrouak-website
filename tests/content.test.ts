import { describe, expect, it } from 'vitest';
import { projects } from '../src/data/projects';
import { services } from '../src/data/services';

describe('site content', () => {
  it('contains all six service categories with unique ids', () => {
    expect(services).toHaveLength(6);
    expect(new Set(services.map((service) => service.id)).size).toBe(6);
  });

  it('contains three clearly identified illustrative portfolio projects', () => {
    expect(projects.map((project) => project.slug)).toEqual(['syrian-menu', 'pet-corner', 'mashwarak']);
    expect(projects.every((project) => project.visualLabel.length > 0)).toBe(true);
  });
});
