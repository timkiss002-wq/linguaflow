import { expect, it } from 'vitest';
import { sectionsFor } from './nav';

it('shows only the areas and tabs of the language being studied', () => {
  const en = sectionsFor('en');
  const zh = sectionsFor('zh');
  expect(en.map((s) => s.id)).toContain('ielts');
  expect(zh.map((s) => s.id)).not.toContain('ielts');
  expect(zh.find((s) => s.id === 'words')!.tabs!.map((t) => t.to)).not.toContain('/word-forms');
  expect(en.find((s) => s.id === 'words')!.tabs!.map((t) => t.to)).toContain('/word-forms');
});
