import { daysUntil, hskWordPlan, lessonLevelFor, recommendLessons, validateGoal, type Goal } from './goals';

const TODAY = new Date('2026-11-08T10:00:00');
const g = (over: Partial<Goal>): Goal => ({ language: 'zh', exam: 'hsk2', current_level: '3', target_level: '4', exam_date: null, focus_skills: [], ...over });

describe('validateGoal', () => {
  it('accepts a sensible goal', () => {
    expect(validateGoal(g({ exam_date: '2027-06-01' }), TODAY)).toEqual([]);
    expect(validateGoal(g({ language: 'en', exam: 'ielts', current_level: '5.5', target_level: '7.0' }), TODAY)).toEqual([]);
  });
  it('rejects wrong exam/language, non-increasing levels and bad dates', () => {
    expect(validateGoal(g({ language: 'en', exam: 'hsk2' }), TODAY)).toContain('Choose an exam for this language.');
    expect(validateGoal(g({ target_level: '3' }), TODAY)).toContain('Your target should be higher than your current level.');
    expect(validateGoal(g({ current_level: '9' }), TODAY)).toContain('Choose your current level.');
    expect(validateGoal(g({ exam_date: '2026-01-01' }), TODAY)).toContain('Exam date is in the past.');
    expect(validateGoal(g({ exam_date: '2035-01-01' }), TODAY)).toContain('Exam date is more than 5 years away.');
  });
});

describe('lessonLevelFor', () => {
  it('maps IELTS bands to CEFR', () => {
    expect(lessonLevelFor(g({ language: 'en', exam: 'ielts', current_level: '3.5' })).cefr).toBe('elementary');
    expect(lessonLevelFor(g({ language: 'en', exam: 'ielts', current_level: '5.0' })).cefr).toBe('intermediate');
    expect(lessonLevelFor(g({ language: 'en', exam: 'ielts', current_level: '6.5' })).cefr).toBe('upper_intermediate');
    expect(lessonLevelFor(g({ language: 'en', exam: 'ielts', current_level: '7.5' })).cefr).toBe('advanced');
  });
  it('maps HSK 3.0 onto the 6-level lesson scale', () => {
    expect(lessonLevelFor(g({ exam: 'hsk3', current_level: '5' })).hsk).toBe(4);
    expect(lessonLevelFor(g({ exam: 'hsk3', current_level: '8' })).hsk).toBe(6);
    expect(lessonLevelFor(g({ exam: 'hsk2', current_level: '0' })).hsk).toBe(1);
  });
});

describe('recommendLessons', () => {
  const L = (id: string, hsk: number | null, topic: string, language = 'zh', level = 'intermediate') => ({ id, language, level, hsk_level: hsk, topic_slug: topic });
  const lessons = [L('h3-daily', 3, 'daily-conversation'), L('h4-work', 4, 'business-career'), L('h4-daily', 4, 'daily-conversation'), L('h6', 6, 'education'), L('h2', 2, 'travel'), L('en', null, 'travel', 'en')];
  it('prefers one step above, then interests, skips completed and other languages', () => {
    const recs = recommendLessons(lessons, g({}), ['daily-conversation'], new Set(['h3-daily']));
    expect(recs.map((r) => r.lesson.id)).toEqual(['h4-daily', 'h4-work', 'h2']);
    expect(recs[0]!.reasons).toEqual(['one step above your level', 'matches your interests']);
  });
  it('never recommends lessons far above the level', () => {
    expect(recommendLessons(lessons, g({}), [], new Set()).map((r) => r.lesson.id)).not.toContain('h6');
  });
});

describe('plan numbers', () => {
  it('counts days to the exam', () => {
    expect(daysUntil('2026-11-18', TODAY)).toBe(10);
    expect(daysUntil(null, TODAY)).toBeNull();
  });
  it('computes words per day for an HSK goal', () => {
    const coverage = [3, 4].map((level) => ({ level, total: level === 4 ? 1200 : 600, saved: 50, known: 200 }));
    expect(hskWordPlan(g({ exam_date: '2026-11-18' }), coverage, TODAY)).toEqual({ total: 1200, saved: 50, known: 200, remaining: 1000, perDay: 100, days: 10 });
    expect(hskWordPlan(g({ language: 'en', exam: 'ielts' }), coverage, TODAY)).toBeNull();
  });
});
