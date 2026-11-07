import { describe, expect, it } from 'vitest';
import { TOPICS, checkTranslation, expandContractions } from './drills';

describe('grammar drill content', () => {
  it('has well-formed topics', () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(10);
    const ids = new Set<string>();
    for (const t of TOPICS) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.items.length).toBe(8);
      expect(t.formula.length).toBeGreaterThan(1);
      for (const it of t.items) {
        expect(it.vi.trim()).not.toBe('');
        expect(it.en.length).toBeGreaterThan(0);
      }
    }
  });

  it('accepts every listed answer, and each one only once after normalising', () => {
    for (const t of TOPICS)
      for (const it of t.items) {
        const seen = new Set<string>();
        for (const a of it.en) {
          expect(checkTranslation(it, a).verdict, `${t.id}: ${a}`).toBe('correct');
          const key = expandContractions(a).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
          expect(seen.has(key), `duplicate in ${t.id}: ${a}`).toBe(false);
          seen.add(key);
        }
      }
  });
});

describe('checkTranslation', () => {
  const item = { vi: '', scene: '', hint: '', en: ["He doesn't like football.", 'He doesn’t like soccer.'] };
  it('accepts contractions either way, ignores case and punctuation', () => {
    expect(checkTranslation(item, 'he does not like football').verdict).toBe('correct');
    expect(checkTranslation({ ...item, en: ['He does not like football.'] }, "He doesn't like football!").verdict).toBe('correct');
    expect(checkTranslation(item, 'HE DOESN’T LIKE SOCCER').verdict).toBe('correct');
  });
  it('separates spelling slips from grammar mistakes and picks the closest answer', () => {
    expect(checkTranslation(item, "He doesn't like footbal").verdict).toBe('spelling');
    const wrong = checkTranslation(item, "He don't likes soccer");
    expect(wrong.verdict).toBe('wrong');
    expect(wrong.closest).toBe('He doesn’t like soccer.');
  });
  it('expands the usual contractions', () => {
    expect(expandContractions("I'm sure it's fine, they'll come and we'd go; I can't, won't")).toBe('I am sure it is fine, they will come and we would go; I can not, will not');
    expect(expandContractions("the city's population")).toBe("the city's population");
  });
});
