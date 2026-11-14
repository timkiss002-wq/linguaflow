import { expect, it } from 'vitest';
import { SECTIONS, isFocusRoute, sectionFor, tabFor } from './nav';

it('has five areas without Listening, dictation or Chinese, and a page belongs to the tab with the longest matching path', () => {
  expect(SECTIONS.map((s) => s.id)).toEqual(['home', 'path', 'practice', 'words', 'progress']);
  const tabs = SECTIONS.flatMap((s) => s.tabs ?? []).map((t) => t.to);
  expect(tabs).not.toContain('/ielts/listening');
  expect(tabs).not.toContain('/lessons');
  expect(tabFor(sectionFor('/ielts/passage3'), '/ielts/passage3')?.label).toBe('Reading');
  expect(sectionFor('/lo-trinh/2026-11-16')?.id).toBe('path');
  const s = sectionFor('/writing/guided/abc');
  expect(s?.id).toBe('practice');
  expect(tabFor(s, '/writing/guided/abc')?.label).toBe('Writing');
  expect(tabFor(s, '/writing/new/t1')?.label).toBe('Viết tự do');
});

it('opens the placement test in focus mode but not the day pages', () => {
  expect(isFocusRoute('/lo-trinh/kiem-tra')).toBe(true);
  expect(isFocusRoute('/lo-trinh/2026-11-16')).toBe(false);
  expect(isFocusRoute('/ielts/reading')).toBe(false);
});
