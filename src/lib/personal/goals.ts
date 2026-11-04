import type { CefrLevel } from '@/features/library/constants';

export type Exam = 'ielts' | 'cefr' | 'hsk2' | 'hsk3';
export type Language = 'en' | 'zh';
export type Skill = 'listening' | 'vocabulary' | 'grammar' | 'reading' | 'writing' | 'speaking' | 'characters';

export const EXAMS: Record<Exam, { label: string; languages: Language[]; levels: string[]; describe: (l: string) => string }> = {
  ielts: {
    label: 'IELTS',
    languages: ['en'],
    levels: ['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'],
    describe: (l) => `Band ${l}`,
  },
  cefr: { label: 'General (CEFR)', languages: ['en', 'zh'], levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], describe: (l) => l },
  hsk2: { label: 'HSK 2.0 (6 levels)', languages: ['zh'], levels: ['0', '1', '2', '3', '4', '5', '6'], describe: (l) => (l === '0' ? 'Beginner' : `HSK ${l}`) },
  hsk3: { label: 'HSK 3.0 (9 levels)', languages: ['zh'], levels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], describe: (l) => (l === '0' ? 'Beginner' : `HSK ${l}`) },
};

export const SKILLS: { value: Skill; label: string; languages: Language[] }[] = [
  { value: 'listening', label: 'Listening', languages: ['en', 'zh'] },
  { value: 'vocabulary', label: 'Vocabulary', languages: ['en', 'zh'] },
  { value: 'grammar', label: 'Grammar', languages: ['en', 'zh'] },
  { value: 'reading', label: 'Reading', languages: ['en', 'zh'] },
  { value: 'writing', label: 'Writing', languages: ['en', 'zh'] },
  { value: 'speaking', label: 'Speaking', languages: ['en', 'zh'] },
  { value: 'characters', label: 'Characters (汉字)', languages: ['zh'] },
];

/** Interests: the first ones are lesson topics (used for recommendations); all feed writing prompts later. */
export const INTERESTS: { value: string; label: string; topic?: string }[] = [
  { value: 'daily-conversation', label: 'Daily life', topic: 'daily-conversation' },
  { value: 'travel', label: 'Travel', topic: 'travel' },
  { value: 'business-career', label: 'Work & career', topic: 'business-career' },
  { value: 'education', label: 'Education', topic: 'education' },
  { value: 'entertainment', label: 'Entertainment', topic: 'entertainment' },
  { value: 'movies-tv', label: 'Films & TV', topic: 'movies-tv' },
  { value: 'podcast-interviews', label: 'Podcasts & interviews', topic: 'podcast-interviews' },
  { value: 'technology', label: 'Technology' },
  { value: 'environment', label: 'Environment' },
  { value: 'health', label: 'Health' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'economics', label: 'Economics' },
  { value: 'science', label: 'Science' },
  { value: 'culture-history', label: 'Culture & history' },
  { value: 'food', label: 'Food' },
  { value: 'sports', label: 'Sports' },
  { value: 'music', label: 'Music' },
];

export interface Goal {
  language: Language;
  exam: Exam;
  current_level: string;
  target_level: string;
  exam_date: string | null;
  focus_skills: string[];
}

export const levelIndex = (exam: Exam, level: string) => EXAMS[exam].levels.indexOf(level);

/** Problems with a goal, as user-facing sentences (empty = valid). */
export function validateGoal(g: Goal, today = new Date()): string[] {
  const errs: string[] = [];
  const exam = EXAMS[g.exam];
  if (!exam || !exam.languages.includes(g.language)) errs.push('Choose an exam for this language.');
  else {
    const c = levelIndex(g.exam, g.current_level);
    const t = levelIndex(g.exam, g.target_level);
    if (c < 0) errs.push('Choose your current level.');
    if (t < 0) errs.push('Choose your target level.');
    if (c >= 0 && t >= 0 && t <= c) errs.push('Your target should be higher than your current level.');
  }
  if (g.exam_date) {
    const d = new Date(`${g.exam_date}T00:00:00`);
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    if (Number.isNaN(d.getTime())) errs.push('Exam date is not valid.');
    else if (d < start) errs.push('Exam date is in the past.');
    else if (d.getTime() - start.getTime() > 5 * 365 * 86_400_000) errs.push('Exam date is more than 5 years away.');
  }
  return errs;
}

/** HSK 3.0 levels mapped onto the 6-level scale our lessons use (approximate). */
const V3_TO_V2 = [0, 1, 2, 3, 4, 4, 5, 6, 6, 6];

/** The lesson level that matches the learner now: CEFR for everyone, plus HSK (1–6) for Chinese. */
export function lessonLevelFor(g: Goal): { cefr: CefrLevel; hsk: number | null } {
  const cefrFromIndex = (i: number): CefrLevel => (['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced', 'advanced'] as const)[Math.min(Math.max(i, 0), 5)]!;
  if (g.exam === 'cefr') return { cefr: cefrFromIndex(levelIndex('cefr', g.current_level)), hsk: null };
  if (g.exam === 'ielts') {
    const band = Number(g.current_level);
    // Common IELTS↔CEFR alignment: 4.0–5.0 ≈ B1, 5.5–6.5 ≈ B2, 7.0–8.0 ≈ C1.
    const cefr: CefrLevel = band < 4 ? 'elementary' : band <= 5 ? 'intermediate' : band <= 6.5 ? 'upper_intermediate' : 'advanced';
    return { cefr, hsk: null };
  }
  const n = Number(g.current_level);
  const hsk = g.exam === 'hsk2' ? n : V3_TO_V2[n]!;
  const cefr: CefrLevel = hsk <= 1 ? 'beginner' : hsk === 2 ? 'elementary' : hsk <= 4 ? 'intermediate' : hsk === 5 ? 'upper_intermediate' : 'advanced';
  return { cefr, hsk: Math.max(1, hsk) };
}

const CEFR_ORDER: CefrLevel[] = ['beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced'];

export interface LessonLike {
  id: string | null;
  language: string | null;
  level: string | null;
  hsk_level: number | null;
  topic_slug: string | null;
}

export interface Recommendation<L> {
  lesson: L;
  score: number;
  reasons: string[];
}

/**
 * Lessons at the learner's level or one step above ("i+1"), favouring their interests,
 * skipping completed ones. Every pick says why it was chosen.
 */
export function recommendLessons<L extends LessonLike>(lessons: L[], goal: Goal, interests: string[], completed: Set<string>, limit = 3): Recommendation<L>[] {
  const target = lessonLevelFor(goal);
  const topics = new Set(INTERESTS.filter((i) => interests.includes(i.value) && i.topic).map((i) => i.topic!));
  return lessons
    .filter((l) => l.language === goal.language && l.id && !completed.has(l.id))
    .map((lesson) => {
      const reasons: string[] = [];
      let score = 0;
      const diff =
        goal.language === 'zh' && target.hsk !== null && lesson.hsk_level
          ? lesson.hsk_level - target.hsk
          : CEFR_ORDER.indexOf(lesson.level as CefrLevel) - CEFR_ORDER.indexOf(target.cefr);
      if (diff === 1) {
        score += 3;
        reasons.push('one step above your level');
      } else if (diff === 0) {
        score += 2.5;
        reasons.push('at your level');
      } else if (diff === -1) {
        score += 1;
        reasons.push('easy review');
      } else if (diff > 1) score -= 2;
      if (lesson.topic_slug && topics.has(lesson.topic_slug)) {
        score += 1;
        reasons.push('matches your interests');
      }
      return { lesson, score, reasons };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function daysUntil(date: string | null, now = new Date()): number | null {
  if (!date) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${date}T00:00:00`).getTime() - start.getTime()) / 86_400_000);
}

export interface CoverageRow {
  level: number;
  total: number;
  saved: number;
  known: number;
}

/**
 * For an HSK goal: how many words of the target level's list (cumulative) are still unknown,
 * and how many new words a day that means until the exam (if a date is set).
 */
export function hskWordPlan(goal: Goal, coverage: CoverageRow[], now = new Date()) {
  if (goal.exam !== 'hsk2' && goal.exam !== 'hsk3') return null;
  const t = Number(goal.target_level);
  const row = coverage.find((c) => c.level === (goal.exam === 'hsk3' ? Math.min(t, 7) : t));
  if (!row) return null;
  const remaining = Math.max(0, row.total - row.known);
  const days = daysUntil(goal.exam_date, now);
  return { total: row.total, saved: row.saved, known: row.known, remaining, perDay: days && days > 0 ? Math.ceil(remaining / days) : null, days };
}
