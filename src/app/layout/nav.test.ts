import { expect, it } from 'vitest';
import { sectionsFor } from './nav';

it('shows only the areas and tabs of the language being studied', () => {
  const en = sectionsFor('en');
  const zh = sectionsFor('zh');
  expect(en.find((s) => s.id === 'practice')!.tabs!.map((t) => t.to)).toContain('/ielts/reading');
  expect(zh.find((s) => s.id === 'practice')!.tabs!.map((t) => t.to)).toEqual(['/writing']);
  expect(zh.find((s) => s.id === 'practice')!.to).toBe('/writing');
  expect(zh.find((s) => s.id === 'words')!.tabs!.map((t) => t.to)).not.toContain('/word-forms');
  expect(en.find((s) => s.id === 'words')!.tabs!.map((t) => t.to)).toContain('/word-forms');
});

it('has five areas, and a page belongs to the tab with the longest matching path', async () => {
  const { SECTIONS, sectionFor, tabFor } = await import('./nav');
  expect(SECTIONS).toHaveLength(5);
  const s = sectionFor('/writing/guided/abc');
  expect(s?.id).toBe('practice');
  expect(tabFor(s, '/writing/guided/abc')?.label).toBe('Writing');
  expect(tabFor(s, '/writing/new/t1')?.label).toBe('Viết tự do');
});
