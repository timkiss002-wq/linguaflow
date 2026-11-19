import { describe, expect, it } from 'vitest';
import { ARGUE_MCQ, PARAGRAPHS, argueLevelOf, pickArgue } from '@/lib/argue-daily';
import { REVIEW_AT, reviewLines, reviewMcq, weakestToReview } from '@/lib/grammar-review';
import { checkWrite } from '@/lib/practice/items';
import { dayByDate } from '@/lib/roadmap/plan';
import { TAGS, emptyLog } from '@/lib/translate-daily';
import { LINK_GROUPS, LINK_MCQ, LINK_WRITE, linkLevelOf, mcqOf, pickLinking, writeOf } from './index';

describe('linking words', () => {
  it('content is well formed for every level', () => {
    for (let l = 1; l <= 4; l++) {
      expect(LINK_MCQ.filter((m) => m.level === l).length, `mcq ${l}`).toBeGreaterThanOrEqual(20);
      expect(LINK_WRITE.filter((w) => w.level === l).length, `write ${l}`).toBeGreaterThanOrEqual(10);
    }
    for (const m of LINK_MCQ) {
      expect(m.o[m.a], m.id).toBeTruthy();
      expect(m.q).toContain('___');
    }
    for (const w of LINK_WRITE) {
      for (const a of w.en) expect(checkWrite(w, a, true).verdict, a).toBe('correct');
      expect(checkWrite(w, w.prompt, true).verdict, `${w.key} prompt must not already be right`).toBe('wrong');
    }
    expect(LINK_GROUPS.length).toBeGreaterThanOrEqual(15);
  });
  it('gives 6 + 4 items, wrong ones first, from the level of the day', () => {
    expect(linkLevelOf('2026-11-19')).toBe(1);
    expect(linkLevelOf('2027-01-30')).toBe(4);
    const set = pickLinking('2026-12-05', ['l:contrast:q2'], {});
    expect(mcqOf(set)).toHaveLength(6);
    expect(writeOf(set)).toHaveLength(4);
    expect(set.mcq).toContain('l:contrast:q2');
    for (const m of mcqOf(set)) expect(m.level).toBeLessThanOrEqual(2);
  });
});

describe('argument skills', () => {
  it('paragraphs start with the point or the other view, questions are well formed', () => {
    for (const p of PARAGRAPHS) expect(['P', 'O']).toContain(p.s[0]!.r);
    for (const q of ARGUE_MCQ) expect(q.o[q.a], q.id).toBeTruthy();
    expect(argueLevelOf('2027-02-01')).toBe(3);
  });
  it('one paragraph of the level and 4 questions', () => {
    const set = pickArgue('2026-11-20', [], {});
    expect(PARAGRAPHS.find((p) => p.id === set.paragraph)!.level).toBe(1);
    expect(set.questions).toHaveLength(4);
    expect(new Set(set.questions).size).toBe(4);
  });
});

describe('grammar review', () => {
  it('reviews the heaviest point from 3 mistakes', () => {
    expect(weakestToReview(emptyLog())).toBeNull();
    expect(weakestToReview({ ...emptyLog(), tags: { sva: REVIEW_AT, article: 5 } })).toBe('article');
  });
  it('every grammar point has something to review', () => {
    for (const t of Object.keys(TAGS)) expect(reviewMcq(t, 'x').length + reviewLines(t).length, t).toBeGreaterThanOrEqual(8);
  });
  it('new daily tasks are on the path', () => {
    const kinds = dayByDate('2026-11-20')!.tasks.map((t) => t.kind);
    expect(kinds).toEqual(expect.arrayContaining(['linking', 'argue', 'grammar-weak']));
    expect(dayByDate('2026-11-19')!.tasks.some((t) => t.kind === 'grammar-weak')).toBe(false);
  });
});
