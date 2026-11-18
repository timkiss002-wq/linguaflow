import { describe, expect, it } from 'vitest';
import { GRAMMAR_TOPICS, TFNG_PASSAGES, WORD_FORM_MCQ, currentTopic, dailyAmount, grammarSet, openTopics, tfngSet, wordFormSet } from './index';

describe('daily content', () => {
  it('grammar questions are well formed', () => {
    for (const t of GRAMMAR_TOPICS) {
      expect(t.items.length, t.id).toBeGreaterThanOrEqual(10);
      for (const q of t.items) {
        expect(q.o.length, q.q).toBe(4);
        expect(new Set(q.o).size, q.q).toBe(4);
        expect(q.a, q.q).toBeGreaterThanOrEqual(0);
        expect(q.a, q.q).toBeLessThan(4);
        expect(q.w.length, q.q).toBeGreaterThan(5);
      }
    }
  });
  it('grammar topics open in date order, foundation first', () => {
    const dates = GRAMMAR_TOPICS.map((t) => t.from);
    expect([...dates].sort()).toEqual(dates);
    expect(GRAMMAR_TOPICS[0]!.id).toBe('be-there');
  });
  it('TFNG statements have an answer and an explanation, with evidence for TRUE and FALSE', () => {
    expect(TFNG_PASSAGES.length).toBeGreaterThanOrEqual(30);
    for (const p of TFNG_PASSAGES)
      for (const s of p.q) {
        expect(['T', 'F', 'NG']).toContain(s.a);
        expect(s.w.length).toBeGreaterThan(5);
        if (s.a !== 'NG') {
          expect(s.ev, s.s).toBeTruthy();
          expect(p.text.includes(s.ev!), `${p.id}: ${s.ev}`).toBe(true);
        }
      }
  });
  it('word-form questions keep the answer among the options', () => {
    expect(WORD_FORM_MCQ.length).toBeGreaterThan(150);
    for (const m of WORD_FORM_MCQ) {
      expect(m.q).toContain('___');
      expect(m.o[m.a]).toBeTruthy();
      expect(new Set(m.o.map((o) => o.toLowerCase())).size).toBe(m.o.length);
    }
  });
});

describe('daily selection', () => {
  it('starts with the first topic only and grows with the phase', () => {
    expect(openTopics('2026-11-19').map((t) => t.id)).toEqual(['be-there']);
    const first = grammarSet('2026-11-19', 1);
    expect(first).toHaveLength(dailyAmount(1).grammar);
    expect(first.every((m) => m.id.startsWith('g:be-there:'))).toBe(true);
    expect(grammarSet('2027-02-10', 2)).toHaveLength(15);
    expect(grammarSet('2027-03-20', 3)).toHaveLength(20);
  });
  it('mixes the newest topic with earlier ones and never repeats a question in a day', () => {
    const set = grammarSet('2026-12-20', 1);
    const cur = currentTopic('2026-12-20').id;
    const fromCur = set.filter((m) => m.id.includes(`:${cur}:`)).length;
    expect(fromCur).toBeGreaterThanOrEqual(4);
    expect(fromCur).toBeLessThan(set.length);
    expect(new Set(set.map((m) => m.id)).size).toBe(set.length);
  });
  it('brings back questions answered wrong, but only from open topics', () => {
    const wrong = ['g:be-there:3', 'g:reported:1'];
    const set = grammarSet('2026-11-23', 1, wrong);
    expect(set.map((m) => m.id)).toContain('g:be-there:3');
    expect(set.map((m) => m.id)).not.toContain('g:reported:1');
  });
  it('is the same for the same day', () => {
    expect(grammarSet('2026-12-01', 1).map((m) => m.id)).toEqual(grammarSet('2026-12-01', 1).map((m) => m.id));
  });
  it('word form and TFNG amounts follow the phase', () => {
    expect(wordFormSet('2026-11-19', 1, 0)).toHaveLength(5);
    expect(wordFormSet('2027-03-20', 3, 120)).toHaveLength(10);
    expect(tfngSet(1, 0)).toHaveLength(1);
    expect(new Set(tfngSet(3, 7).map((p) => p.id)).size).toBe(3);
  });
});
