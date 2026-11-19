import { describe, expect, it } from 'vitest';
import { checkWrite } from '@/lib/practice/items';
import { dayByDate } from '@/lib/roadmap/plan';
import { TAGS } from '@/lib/translate-daily';
import { PER_DAY, Q_GROUPS, Q_ITEMS, pickQuestions, qItemsOf, qLevelOf } from './index';

describe('daily question forming', () => {
  it('content is well formed for every level', () => {
    for (let l = 1; l <= 6; l++) expect(Q_ITEMS.filter((q) => q.level === l).length, `level ${l}`).toBeGreaterThanOrEqual(15);
    for (const g of Q_GROUPS) for (const t of g.tags) expect(TAGS[t], `${g.id}: ${t}`).toBeTruthy();
    for (const q of Q_ITEMS) {
      for (const a of q.en) expect(checkWrite(q, a, true).verdict, `${q.key}: ${a}`).toBe('correct');
      // the answer sentence itself (brackets removed) is never accepted as the question
      expect(checkWrite(q, q.prompt.replace(/[[\]]/g, ''), true).verdict, q.key).toBe('wrong');
    }
  });
  it('accepts contractions and no question mark, rejects the classic mistakes', () => {
    const where = Q_ITEMS.find((q) => q.prompt.startsWith('She works [at a bank]'))!;
    expect(checkWrite(where, 'where does she work', true).verdict).toBe('correct');
    expect(checkWrite(where, 'Where does she works?', true).verdict).not.toBe('correct');
    expect(checkWrite(where, 'Where she works?', true).verdict).not.toBe('correct');
    const went = Q_ITEMS.find((q) => q.prompt.startsWith('I went [to Da Nang]'))!;
    expect(checkWrite(went, 'Where did you went last summer?', true).verdict).not.toBe('correct');
  });
  it('gives 5 a day from the level of the day, wrong ones first, and extra rounds never repeat the day', () => {
    expect(qLevelOf('2026-11-19')).toBe(1);
    expect(qLevelOf('2027-02-01')).toBe(6);
    const wrong = Q_ITEMS.find((q) => q.level === 1)!.key;
    const day = pickQuestions('2026-12-10', [wrong], {});
    expect(day).toHaveLength(PER_DAY);
    expect(day).toContain(wrong);
    for (const q of qItemsOf(day)) expect(q.level).toBeLessThanOrEqual(qLevelOf('2026-12-10'));
    const extra = pickQuestions('2026-12-10', [], {}, PER_DAY, day);
    expect(extra).toHaveLength(PER_DAY);
    expect(extra.some((k) => day.includes(k))).toBe(false);
  });
  it('is a daily task from 19/11', () => {
    expect(dayByDate('2026-11-19')!.tasks.some((t) => t.kind === 'questions' && t.href === '/dat-cau-hoi/2026-11-19')).toBe(true);
  });
});
