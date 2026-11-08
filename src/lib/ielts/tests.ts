/**
 * IELTS-style Reading and Listening practice tests: content types, marking and band scores. Pure, no I/O.
 * Content: content/ielts-tests/*.json (written for LinguaFlow, not copied from published tests).
 */
import { spellingSimilarity } from '@/lib/compare/align';
import listening1 from '../../../content/ielts-tests/listening-1.json';
import listening2 from '../../../content/ielts-tests/listening-2.json';
import listeningPart1 from '../../../content/ielts-tests/listening-part1.json';
import reading1 from '../../../content/ielts-tests/reading-1.json';
import reading2 from '../../../content/ielts-tests/reading-2.json';

export type Skill = 'reading' | 'listening';
export type QuestionType = 'tfng' | 'ynng' | 'mcq' | 'headings' | 'matching' | 'gap';

export interface Question {
  n: number;
  text: string;
  /** choice questions: the option key; gap questions: every accepted answer */
  answer: string | string[];
  /** mcq only: [key, text] */
  options?: string[][];
  /** exact quote from the passage / script that gives the answer */
  evidence: string;
  explain_vi: string;
}
export interface QuestionGroup {
  type: QuestionType;
  instructions: string;
  title?: string;
  /** headings / matching: [key, text] shared by the group */
  options?: string[][];
  /** gap: word limit (numbers are free when allowNumber) */
  maxWords?: number;
  allowNumber?: boolean;
  questions: Question[];
}
export interface TestPart {
  id: string;
  title: string;
  heading: string;
  /** reading: [label | null, text] */
  paragraphs?: (string | null)[][];
  /** listening */
  context?: string;
  speakers?: Record<string, { name: string; voice: 'male' | 'female' }>;
  script?: string[][];
  groups: QuestionGroup[];
}
export interface PracticeTest {
  id: string;
  skill: Skill;
  title: string;
  minutes: number;
  /** separate short exercises (e.g. a bank of Part 1s), not one 40-question test */
  pack?: boolean;
  parts: TestPart[];
}

export const TESTS: PracticeTest[] = [reading1, listening1, reading2, listening2, listeningPart1] as unknown as PracticeTest[];

/** Every listening Part 1 (from the full tests and the Part 1 bank), for the daily task. */
export const LISTENING_PART1 = TESTS.filter((t) => t.skill === 'listening').flatMap((t) => (t.pack ? t.parts : t.parts.slice(0, 1)).map((part) => ({ test: t, part })));
export const testById = (id: string) => TESTS.find((t) => t.id === id);

export const TYPE_LABEL: Record<QuestionType, { en: string; vi: string }> = {
  tfng: { en: 'True / False / Not Given', vi: 'Đúng / Sai / Không có thông tin' },
  ynng: { en: 'Yes / No / Not Given', vi: 'Quan điểm tác giả: Yes / No / Not Given' },
  mcq: { en: 'Multiple choice', vi: 'Trắc nghiệm' },
  headings: { en: 'Matching headings', vi: 'Nối tiêu đề với đoạn văn' },
  matching: { en: 'Matching', vi: 'Nối thông tin' },
  gap: { en: 'Completion', vi: 'Điền từ (form, note, sentence, summary)' },
};

export const CHOICES: Partial<Record<QuestionType, string[][]>> = {
  tfng: [['TRUE', 'TRUE'], ['FALSE', 'FALSE'], ['NOT GIVEN', 'NOT GIVEN']],
  ynng: [['YES', 'YES'], ['NO', 'NO'], ['NOT GIVEN', 'NOT GIVEN']],
};

/** The options a question offers (empty for gap questions). */
export function optionsFor(group: QuestionGroup, q: Question): string[][] {
  return q.options ?? group.options ?? CHOICES[group.type] ?? [];
}

export function partQuestions(part: TestPart): { group: QuestionGroup; q: Question }[] {
  return part.groups.flatMap((group) => group.questions.map((q) => ({ group, q })));
}

/* ───────────── marking ───────────── */

const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

/** Lower case, no accents, curly quotes straightened, hyphens = spaces, outer punctuation and articles removed. */
export function normalizeAnswer(s: string): string {
  return stripAccents(s.normalize('NFKC'))
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[£$€]/g, '')
    .replace(/[-–—_/]/g, ' ')
    .replace(/(\d)[\s,](?=\d)/g, '$1')
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');
}

/** Words that count towards the limit; when numbers are allowed, a number does not count. */
export function countAnswerWords(s: string, allowNumber = false): number {
  const words = s
    .trim()
    .replace(/(\d)[\s,](?=\d)/g, '$1')
    .split(/\s+/)
    .filter(Boolean);
  return allowNumber ? words.filter((w) => !/^[£$€]?\d[\d.,:]*(st|nd|rd|th|am|pm)?$/i.test(w)).length : words.length;
}

export type Mark = 'correct' | 'empty' | 'wrong' | 'spelling' | 'too_long';

export function markQuestion(group: QuestionGroup, q: Question, given: string | undefined): Mark {
  const raw = (given ?? '').trim();
  if (!raw) return 'empty';
  if (group.type !== 'gap') return raw.toUpperCase() === String(q.answer).toUpperCase() ? 'correct' : 'wrong';
  const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map(normalizeAnswer);
  const mine = normalizeAnswer(raw);
  // as in the exam: an answer over the word limit is wrong, even if it contains the right words
  if (countAnswerWords(raw, group.allowNumber) > (group.maxWords ?? 3)) return 'too_long';
  if (accepted.includes(mine)) return 'correct';
  if (accepted.some((a) => a.length >= 4 && spellingSimilarity(a.replace(/ /g, ''), mine.replace(/ /g, '')) >= 0.8)) return 'spelling';
  return 'wrong';
}

export interface QuestionResult {
  n: number;
  type: QuestionType;
  part: string;
  given: string;
  mark: Mark;
}

export function markParts(test: PracticeTest, partIds: string[], answers: Record<number, string>): QuestionResult[] {
  return test.parts
    .filter((p) => partIds.includes(p.id))
    .flatMap((p) => partQuestions(p).map(({ group, q }) => ({ n: q.n, type: group.type, part: p.id, given: answers[q.n] ?? '', mark: markQuestion(group, q, answers[q.n]) })));
}

/* ───────────── band scores ───────────── */

// Raw score (out of 40) → band. Approximate conversion tables commonly published for IELTS practice.
const LISTENING: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 0]];
const READING_ACADEMIC: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 0]];

/** Estimated band for a full test (40 questions); null for a partial attempt. */
export function bandFor(skill: Skill, correct: number, total: number): number | null {
  if (total !== 40) return null;
  const table = skill === 'listening' ? LISTENING : READING_ACADEMIC;
  return table.find(([min]) => correct >= min)![1];
}

/** Raw score needed for a band in a full test (to show "x more for band y"). */
export function rawFor(skill: Skill, band: number): number | null {
  const row = (skill === 'listening' ? LISTENING : READING_ACADEMIC).find(([, b]) => b === band);
  return row ? row[0] : null;
}

/* ───────────── weak spots ───────────── */

export interface TypeStat {
  type: QuestionType;
  answered: number;
  correct: number;
  /** wrong because of spelling or the word limit (gap questions) */
  form: number;
}

export function statsByType(results: Pick<QuestionResult, 'type' | 'mark'>[]): TypeStat[] {
  const m = new Map<QuestionType, TypeStat>();
  for (const r of results) {
    const s = m.get(r.type) ?? { type: r.type, answered: 0, correct: 0, form: 0 };
    s.answered += 1;
    if (r.mark === 'correct') s.correct += 1;
    if (r.mark === 'spelling' || r.mark === 'too_long') s.form += 1;
    m.set(r.type, s);
  }
  return [...m.values()].sort((a, b) => a.correct / a.answered - b.correct / b.answered);
}

/** Where the evidence quote sits in a text, for highlighting (null if absent). */
export function findEvidence(text: string, evidence: string): [number, number] | null {
  const i = text.indexOf(evidence);
  return i < 0 ? null : [i, i + evidence.length];
}

export const fmtBand = (b: number) => (Number.isInteger(b) ? `${b}.0` : String(b));
