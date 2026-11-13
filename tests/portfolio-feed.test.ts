import { describe, expect, it } from 'vitest';
import { normalizeFeed, projectText } from '../src/features/portfolio/project-feed';

const project = { id: 'one', title: 'First', category: 'web' as const, order: 2, images: ['https://example.com/image.png'] };
describe('Portfolio feed contract', () => {
  it('accepts add, update and delete snapshots without retaining removed records', () => {
    const initial = normalizeFeed({ version: 1, projects: [project] });
    expect(initial.map((item) => item.id)).toEqual(['one']);
    const next = normalizeFeed({ version: 1, projects: [{ ...project, title: 'Updated' }, { id: 'two', title: 'New', category: 'mobile', order: 1 }] });
    expect(next.map((item) => item.title)).toEqual(['New', 'Updated']);
    expect(normalizeFeed({ version: 1, projects: [next[1]] }).map((item) => item.id)).toEqual(['one']);
  });
  it('handles optional fields, translation fallback and duplicate IDs', () => {
    const [item] = normalizeFeed({ version: 1, projects: [project, project] });
    expect(item?.features).toEqual([]);
    expect(projectText(item!, 'ar').title).toBe('First');
    expect(normalizeFeed({ version: 1, projects: [project, project] })).toHaveLength(1);
  });
  it('rejects malformed or unsafe URLs', () => {
    expect(() => normalizeFeed({ version: 1, projects: [{ ...project, liveUrl: 'javascript:alert(1)' }] })).toThrow();
    expect(() => normalizeFeed({ version: 1, projects: [{ ...project, images: ['http://example.com/image.png'] }] })).toThrow();
  });
});
