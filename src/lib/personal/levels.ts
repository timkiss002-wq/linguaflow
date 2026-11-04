import { levelIndex, type Goal } from './goals';

export type TestSkill = 'vocabulary' | 'grammar' | 'characters' | 'reading' | 'listening';
export const TEST_SKILLS: Record<'en' | 'zh', TestSkill[]> = {
  zh: ['vocabulary', 'grammar', 'listening', 'characters', 'reading'],
  en: ['vocabulary', 'grammar', 'listening', 'reading'],
};
export const SKILL_LABEL: Record<TestSkill, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  characters: 'Characters (汉字)',
  reading: 'Reading',
  listening: 'Listening',
};

/** Question rating for level 1–6 (HSK 1–6 / A1–C2); same formula as the seed. */
export const levelRating = (level: number) => 800 + 150 * (level - 1);
/** Chance of answering a question right (Elo). */
export const pCorrect = (rating: number, itemRating: number) => 1 / (1 + 10 ** ((itemRating - rating) / 400));

/**
 * Your level = the hardest level (0–6) whose questions you answer correctly at least half the time — the usual
 * Elo/IRT meaning of ability; easier levels you get right more often. 0 = below level 1.
 */
export function ratingToLevel(rating: number): number {
  return Math.max(0, Math.min(6, Math.floor((rating - levelRating(1)) / 150) + 1));
}

/** Continuous position on the 0–6 scale, for progress bars. */
export function ratingToScale(rating: number): number {
  return Math.max(0, Math.min(6, (rating - levelRating(1)) / 150 + 1));
}

/** Change between two ratings in levels, rounded to 0.1 (0 when too small to mention). */
export function levelDelta(now: number, before: number): number {
  return Math.round(((now - before) / 150) * 10) / 10 || 0; // no -0
}

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export function levelLabel(language: 'en' | 'zh', level: number): string {
  if (level <= 0) return language === 'zh' ? 'Below HSK 1' : 'Below A1';
  return language === 'zh' ? `HSK ${level}` : CEFR[level - 1]!;
}

export type Confidence = 'rough' | 'provisional' | 'stable';
/** Placement tests ask ~4 questions per skill, check-ins ~2. */
export function confidence(n: number): Confidence {
  return n < 4 ? 'rough' : n < 12 ? 'provisional' : 'stable';
}
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  rough: 'rough guess — answer more questions',
  provisional: 'provisional',
  stable: 'stable',
};

/** Where a first test starts (1–6), from the level the learner said they have. */
export function startLevel(goal: Pick<Goal, 'exam' | 'current_level'> | undefined): number {
  if (!goal) return 3;
  if (goal.exam === 'cefr') return Math.max(1, levelIndex('cefr', goal.current_level) + 1);
  if (goal.exam === 'ielts') {
    const band = Number(goal.current_level);
    return band < 4 ? 2 : band <= 5 ? 3 : band <= 6.5 ? 4 : band <= 8 ? 5 : 6;
  }
  const n = Number(goal.current_level);
  const v2 = goal.exam === 'hsk2' ? n : [0, 1, 2, 3, 4, 4, 5, 6, 6, 6][n]!;
  return Math.max(1, Math.min(6, v2));
}

/** Days until a check-in is suggested again. */
export const CHECKIN_EVERY_DAYS = 14;
export function checkinDue(lastFinished: string | null, now = new Date()): boolean {
  if (!lastFinished) return false;
  return now.getTime() - new Date(lastFinished).getTime() >= CHECKIN_EVERY_DAYS * 86_400_000;
}
