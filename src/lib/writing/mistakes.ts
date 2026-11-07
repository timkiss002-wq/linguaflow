/**
 * Mistakes the learner keeps making in English writing, from the stored AI feedback (P6): recurring error
 * categories with examples, band scores over time, and a drill built from the learner's own corrections. Pure.
 */
import { compareEnglish } from '@/lib/compare/english';
import type { CompareResult } from '@/lib/compare';
import { CATEGORIES, type Correction, type Feedback } from '../../../supabase/functions/_shared/writing-feedback.ts';

export interface FeedbackEntry {
  submissionId: string;
  title: string;
  createdAt: string;
  exam: boolean;
  feedback: Feedback;
}

export const CATEGORY_VI: Record<string, string> = {
  tense: 'Thì của động từ',
  agreement: 'Hòa hợp chủ ngữ – động từ',
  article: 'Mạo từ a / an / the',
  preposition: 'Giới từ',
  'word-form': 'Dạng từ (danh / động / tính / trạng)',
  'word-order': 'Trật tự từ',
  vocabulary: 'Chọn từ',
  collocation: 'Kết hợp từ (collocation)',
  'sentence-structure': 'Cấu trúc câu',
  spelling: 'Chính tả',
  punctuation: 'Dấu câu',
  other: 'Khác',
};

export const categoryLabel = (c: string) => CATEGORIES.en[c] ?? c;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
/** Real corrections only: the AI sometimes returns an "original" that is identical to the correction. */
const real = (c: Correction) => c.original.trim() && c.corrected.trim() && norm(c.original) !== norm(c.corrected);

const english = (entries: FeedbackEntry[]) => entries.filter((e) => e.feedback.language === 'en');

export interface Recurring {
  category: string;
  /** corrections in this category */
  count: number;
  /** texts in which it appears */
  texts: number;
  /** newest first */
  examples: (Correction & { submissionId: string })[];
}

/** Error categories, the ones that appear in the most texts first. */
export function recurringMistakes(entries: FeedbackEntry[]): Recurring[] {
  const byCat = new Map<string, Recurring & { ids: Set<string> }>();
  const newest = [...english(entries)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const e of newest)
    for (const c of e.feedback.corrections.filter(real)) {
      const r = byCat.get(c.category) ?? { category: c.category, count: 0, texts: 0, examples: [], ids: new Set<string>() };
      r.count += 1;
      r.ids.add(e.submissionId);
      r.texts = r.ids.size;
      r.examples.push({ ...c, submissionId: e.submissionId });
      byCat.set(c.category, r);
    }
  return [...byCat.values()]
    .map((r) => ({ category: r.category, count: r.count, texts: r.texts, examples: r.examples }))
    .sort((a, b) => b.texts - a.texts || b.count - a.count || a.category.localeCompare(b.category));
}

export interface BandRow {
  submissionId: string;
  title: string;
  createdAt: string;
  exam: boolean;
  overall: number;
  /** criterion key → band */
  criteria: Record<string, number>;
}

/** AI band scores of English texts, oldest first. */
export function bandHistory(entries: FeedbackEntry[]): BandRow[] {
  return english(entries)
    .map((e) => ({
      submissionId: e.submissionId,
      title: e.title,
      createdAt: e.createdAt,
      exam: e.exam,
      overall: e.feedback.overall.score,
      criteria: Object.fromEntries(e.feedback.criteria.map((c) => [c.key, c.score])),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Average of the last `n` texts and the change against the `n` before them (null when there are none). */
export function bandSummary(rows: BandRow[], n = 3): { recent: number | null; change: number | null; weakest: string | null } {
  const recent = rows.slice(-n);
  const before = rows.slice(-2 * n, -n);
  const r = avg(recent.map((x) => x.overall));
  const b = avg(before.map((x) => x.overall));
  const keys = [...new Set(recent.flatMap((x) => Object.keys(x.criteria)))];
  const weakest = keys
    .map((k) => ({ k, v: avg(recent.map((x) => x.criteria[k]).filter((v): v is number => v !== undefined)) ?? 9 }))
    .sort((a, b) => a.v - b.v)[0];
  return { recent: r, change: r !== null && b !== null ? Math.round((r - b) * 10) / 10 : null, weakest: weakest?.k ?? null };
}

export interface DrillItem extends Correction {
  id: string;
}

/** The learner's own corrections as exercises: newest first, one per distinct original. */
export function drillItems(entries: FeedbackEntry[], category?: string): DrillItem[] {
  const seen = new Set<string>();
  const out: DrillItem[] = [];
  const newest = [...english(entries)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const e of newest)
    e.feedback.corrections.forEach((c, i) => {
      if (!real(c) || (category && c.category !== category) || seen.has(norm(c.original))) return;
      seen.add(norm(c.original));
      out.push({ ...c, id: `${e.submissionId}:${i}` });
    });
  return out;
}

/** Checks a fix against the AI's correction; small differences in punctuation are fine. */
export function checkFix(answer: string, item: Pick<Correction, 'corrected'>): { ok: boolean; accuracy: number; diff: CompareResult } {
  const diff = compareEnglish(item.corrected, answer, { ignorePunctuation: true });
  return { ok: diff.accuracy >= 95, accuracy: diff.accuracy, diff };
}
