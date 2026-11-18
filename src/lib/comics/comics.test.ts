import { describe, expect, it } from 'vitest';
import { checkWrite } from '@/lib/practice/items';
import { COMICS, gapItems, translateItems } from './index';

describe('comic practice content', () => {
  const book = COMICS[0]!;

  it('has chapters with words, translations and gaps', () => {
    expect(book.chapters.length).toBeGreaterThanOrEqual(9);
    for (const c of book.chapters) {
      expect(c.words.length, c.id).toBeGreaterThanOrEqual(5);
      expect(c.translate.length, c.id).toBeGreaterThanOrEqual(5);
      expect(c.gap.length, c.id).toBeGreaterThanOrEqual(5);
      expect(new Set(book.chapters.map((x) => x.id)).size).toBe(book.chapters.length);
    }
  });

  it('every gap sentence has exactly one blank and a base word that is not already an answer', () => {
    for (const c of book.chapters)
      for (const g of c.gap) {
        expect(g.s.split('___').length - 1, g.s).toBe(1);
        expect(g.a.map((a) => a.toLowerCase()), g.s).not.toContain(g.base.toLowerCase());
      }
  });

  it('accepts every listed answer as correct', () => {
    for (const c of book.chapters) {
      for (const it of translateItems(c)) for (const a of it.en) expect(checkWrite(it, a, false).verdict, `${c.id} ${a}`).toBe('correct');
      for (const it of gapItems(c)) for (const a of it.en) expect(checkWrite(it, a, true).verdict, `${c.id} ${a}`).toBe('correct');
    }
  });

  it('rejects a wrong word form', () => {
    const it = gapItems(book.chapters[0]!)[0]!; // popularity → popular
    expect(checkWrite(it, 'popularity', true).verdict).not.toBe('correct');
  });
});
