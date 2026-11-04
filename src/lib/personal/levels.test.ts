import { describe, expect, it } from 'vitest';
import { checkinDue, confidence, levelDelta, levelLabel, levelRating, pCorrect, ratingToLevel, startLevel } from './levels';

describe('levels', () => {
  it('maps ratings to the hardest level answered right at least half the time', () => {
    expect(pCorrect(levelRating(3), levelRating(3))).toBeCloseTo(0.5, 5);
    expect(pCorrect(levelRating(3), levelRating(2))).toBeGreaterThan(0.7);
    expect(ratingToLevel(levelRating(3))).toBe(3);
    expect(ratingToLevel(levelRating(3) + 149)).toBe(3);
    expect(ratingToLevel(levelRating(3) - 1)).toBe(2);
    expect(ratingToLevel(700)).toBe(0);
    expect(ratingToLevel(3000)).toBe(6);
  });
  it('reports changes in tenths of a level', () => {
    expect(levelDelta(1265, 1346)).toBe(-0.5);
    expect(levelDelta(1100, 1105)).toBe(0);
  });
  it('labels HSK and CEFR levels', () => {
    expect(levelLabel('zh', 4)).toBe('HSK 4');
    expect(levelLabel('en', 4)).toBe('B2');
    expect(levelLabel('en', 0)).toBe('Below A1');
  });
  it('says how sure the estimate is', () => {
    expect(confidence(2)).toBe('rough');
    expect(confidence(4)).toBe('provisional');
    expect(confidence(12)).toBe('stable');
  });
  it('starts the first test at the level the learner gave', () => {
    expect(startLevel(undefined)).toBe(3);
    expect(startLevel({ exam: 'hsk2', current_level: '4' })).toBe(4);
    expect(startLevel({ exam: 'hsk2', current_level: '0' })).toBe(1);
    expect(startLevel({ exam: 'hsk3', current_level: '7' })).toBe(6);
    expect(startLevel({ exam: 'ielts', current_level: '6.0' })).toBe(4);
    expect(startLevel({ exam: 'cefr', current_level: 'C1' })).toBe(5);
  });
  it('suggests a check-in every two weeks', () => {
    const now = new Date('2026-11-20T10:00:00Z');
    expect(checkinDue(null, now)).toBe(false);
    expect(checkinDue('2026-11-10T10:00:00Z', now)).toBe(false);
    expect(checkinDue('2026-11-05T10:00:00Z', now)).toBe(true);
  });
});
