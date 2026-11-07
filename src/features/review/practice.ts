import type { VocabWord } from '@/features/vocabulary/api';
import { compareChinese } from '@/lib/compare/chinese';
import { compareEnglish } from '@/lib/compare/english';
import type { Rating } from '@/lib/srs/sm2';
import { findCloze } from '@/lib/vocab/cloze';
import { familyFor, gradeForm, lemmas, shuffle, splitExample, type Family, type FamilyIndex } from '@/lib/wordforms';

/**
 * "Use the word" review: every card is practised three ways, in rounds —
 *   1. choose the Vietnamese meaning (recognise),
 *   2. fill a gap with the right form of its word family (use it in a sentence),
 *   3. translate the meaning back into the word (recall).
 * The mistakes made decide the spaced-repetition rating, so the learner never has to grade themselves.
 */

export type Step = 'mcq' | 'gap' | 'translate';
export const STEPS: Step[] = ['mcq', 'gap', 'translate'];
export const STEP_LABEL: Record<Step, string> = { mcq: 'Chọn nghĩa', gap: 'Điền dạng từ', translate: 'Dịch sang từ' };

export interface Mcq {
  options: string[];
  answer: number;
}

export interface Gap {
  before: string;
  after: string;
  /** what goes in the blank */
  answer: string;
  /** shown in brackets after the blank, e.g. (decide) */
  base: string;
  /** why that form (from the word-family data), shown after answering */
  why: string | null;
  family: Family | null;
}

export interface PracticeCard {
  word: VocabWord;
  mcq: Mcq | null;
  gap: Gap | null;
}

/** The card can be practised this way (no meaning → no MCQ / translation; no sentence → no gap). */
export const hasStep = (c: PracticeCard, s: Step) => (s === 'mcq' ? Boolean(c.mcq) : s === 'gap' ? Boolean(c.gap) : Boolean(c.word.meaning_vi?.trim()));

const clean = (s: string | null | undefined) => (s ?? '').trim();

/** Four meanings: the right one and three others, same word type first. */
export function makeMcq(word: VocabWord, pool: { meaning: string; pos: string | null }[], seed: number): Mcq | null {
  const right = clean(word.meaning_vi);
  if (!right) return null;
  const seen = new Set([right.toLowerCase()]);
  const others: string[] = [];
  const candidates = [...shuffle(pool.filter((p) => p.pos && p.pos === word.part_of_speech), seed), ...shuffle(pool, seed + 1)];
  for (const c of candidates) {
    const m = clean(c.meaning);
    if (!m || seen.has(m.toLowerCase())) continue;
    seen.add(m.toLowerCase());
    others.push(m);
    if (others.length === 3) break;
  }
  if (others.length < 2) return null;
  const options = shuffle([right, ...others], seed + 2);
  return { options, answer: options.indexOf(right) };
}

/**
 * A gap in a sentence. Preferably an example from the word's family whose answer is a different form
 * (decide → "reached a [decision]"), so the learner has to change the word; otherwise the word itself
 * blanked out of its own context sentence or examples.
 */
export function makeGap(word: VocabWord, index: FamilyIndex | undefined, seed: number): Gap | null {
  const family = word.language === 'en' && index ? familyFor(index, word.term) : null;
  if (family && family.examples.length) {
    const term = word.term.trim().toLowerCase();
    // decided / decides are still 'decide': prefer an answer that is really another word of the family
    const changed = family.examples.filter((e) => !lemmas(e.answer).includes(term));
    const pool = changed.length ? changed : family.examples;
    const ex = pool[seed % pool.length]!;
    const { before, answer, after } = splitExample(ex.sentence);
    return { before, after, answer, base: word.term.trim(), why: ex.why, family };
  }
  const cloze = findCloze([word.context_sentence, ...(word.examples ?? [])], word.term, word.language as 'en' | 'zh');
  if (!cloze) return null;
  return { before: cloze.before, after: cloze.after, answer: cloze.answer, base: word.language === 'en' ? `${cloze.answer[0]}…` : clean(word.meaning_vi) || '…', why: null, family: null };
}

export function buildCards(words: VocabWord[], all: VocabWord[], index: FamilyIndex | undefined, seed = Date.now() % 100000): PracticeCard[] {
  const familyMeanings = index?.families.flatMap((f) => f.members.map((m) => ({ meaning: m.meaning_vi ?? '', pos: m.pos }))) ?? [];
  return words.map((w, i) => {
    const pool = [...all.filter((x) => x.id !== w.id && x.language === w.language).map((x) => ({ meaning: x.meaning_vi ?? '', pos: x.part_of_speech })), ...(w.language === 'en' ? familyMeanings : [])];
    return { word: w, mcq: makeMcq(w, pool, seed + i * 7), gap: makeGap(w, index, seed + i) };
  });
}

export type Mark = 'right' | 'close' | 'wrong';

/** Gap answer: exact, a spelling slip, or wrong (another form of the family counts as wrong — that's the point). */
export function markGap(gap: Gap, typed: string, index: FamilyIndex | undefined, language: 'en' | 'zh'): { mark: Mark; note: string | null } {
  if (!typed.trim()) return { mark: 'wrong', note: null };
  if (gap.family && index) {
    const g = gradeForm(index, gap.family, gap.answer, typed);
    if (g.result === 'correct') return { mark: 'right', note: null };
    if (g.result === 'spelling') return { mark: 'close', note: 'Sai chính tả' };
    if (g.result === 'word_form') return { mark: 'wrong', note: `Đúng họ từ nhưng sai dạng${g.typedPos ? ` (bạn dùng ${POS_VI[g.typedPos]})` : ''}` };
    return { mark: 'wrong', note: null };
  }
  return markWord(gap.answer, typed, language);
}

const POS_VI: Record<string, string> = { noun: 'danh từ', verb: 'động từ', adj: 'tính từ', adv: 'trạng từ' };

/** Typed word vs the saved word: case, spaces and punctuation don't matter; a near miss is a spelling slip. */
export function markWord(expected: string, typed: string, language: 'en' | 'zh'): { mark: Mark; note: string | null } {
  if (!typed.trim()) return { mark: 'wrong', note: null };
  const r = language === 'zh' ? compareChinese(expected, typed, { ignorePunctuation: true }) : compareEnglish(expected, typed, { ignorePunctuation: true });
  if (r.isCorrect) return { mark: 'right', note: null };
  const onlySpelling = Object.entries(r.counts).every(([k, v]) => v === 0 || k === 'misspelled' || k === 'punctuation');
  return onlySpelling ? { mark: 'close', note: 'Sai chính tả' } : { mark: 'wrong', note: null };
}

/**
 * Mistakes → rating: all right first time → Good (Easy if it was already well known),
 * one slip or one miss → Hard, more → Again (comes back in 10 minutes).
 */
export function ratingFor(marks: Mark[], card: { repetitions: number }): Rating {
  const misses = marks.filter((m) => m === 'wrong').length;
  const slips = marks.filter((m) => m === 'close').length;
  if (misses >= 2) return 'again';
  if (misses === 1) return marks.length === 1 ? 'again' : 'hard';
  if (slips > 0) return 'hard';
  return card.repetitions >= 3 ? 'easy' : 'good';
}
