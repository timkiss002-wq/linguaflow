import { GRAMMAR_TOPICS, TOPIC_TAGS, readWrong, type Mcq } from '@/lib/practice-daily';
import { todayKey } from '@/lib/roadmap/plan';
import { DIALOGUES, STORIES, TAGS, lineKey, readErrors, type ErrorLog, type TLine } from '@/lib/translate-daily';
import type { WriteItem } from '@/lib/practice/items';

/**
 * Grammar review given by the mistakes: when one grammar point has been wrong 3 times or more (translation and
 * multiple choice together), the day gets a short review of it — the rule in brief, examples, then 8 questions.
 * The same page opens from "Ôn lại →" next to any mistake.
 */

export const REVIEW_AT = 3;
export const REVIEW_SIZE = 8;

/** Full lessons (/grammar/:id) that teach each grammar point. */
const LESSON: Record<string, string> = {
  be: 'present-simple',
  sva: 'agreement',
  plural: 'nouns-articles',
  article: 'nouns-articles',
  count: 'nouns-articles',
  question: 'present-simple',
  neg: 'present-simple',
  order: 'word-order',
  past: 'past-simple',
  pp: 'present-perfect',
  future: 'future',
  compare: 'comparison',
  modal: 'modals',
  vpat: 'verb-patterns',
  conj: 'contrast-cause',
  cond: 'conditionals',
  rel: 'relative',
  passive: 'passive',
};
export const lessonOf = (tag: string) => LESSON[tag];

/** Multiple-choice topics that train a grammar point. */
export const topicsOf = (tag: string) => GRAMMAR_TOPICS.filter((t) => TOPIC_TAGS[t.id]?.includes(tag));

/** The point to review: the heaviest one at or above the threshold, or null. */
export function weakestToReview(log: ErrorLog): string | null {
  const top = Object.entries(log.tags)
    .filter(([t, w]) => TAGS[t] && w >= REVIEW_AT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? top[0] : null;
}

const KEY = (date: string) => `grammar-review:day:${date}`;

/** The point chosen for a day, fixed once the day's review is opened (null: nothing to review). */
export function frozenReview(date: string): string | null | undefined {
  try {
    const v = localStorage.getItem(KEY(date));
    return v === null ? undefined : (JSON.parse(v) as string | null);
  } catch {
    return undefined;
  }
}

export function reviewFor(date: string): string | null {
  const saved = frozenReview(date);
  if (saved !== undefined) return saved;
  const tag = weakestToReview(readErrors());
  if (date <= todayKey()) {
    try {
      localStorage.setItem(KEY(date), JSON.stringify(tag));
    } catch {
      /* private mode */
    }
  }
  return tag;
}

/** Nothing to review on that day (yet): the day's task counts as done. */
export function nothingToReview(date: string) {
  const saved = frozenReview(date);
  if (saved !== undefined) return saved === null;
  return weakestToReview(readErrors()) === null;
}

/* ---------- content ---------- */

function seedOf(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function shuffle<T>(list: T[], seed: string): T[] {
  let x = seedOf(seed) || 1;
  const r = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Lines of the translation that train the point (dialogues first, the ones answered wrong first). */
export function linesOf(tag: string, log: ErrorLog = readErrors()): { key: string; line: TLine; title: string }[] {
  const all = [
    ...DIALOGUES.flatMap((d) => d.lines.map((line, i) => ({ key: lineKey('d', d.id, i), line, title: d.title, level: d.level }))),
    ...STORIES.flatMap((s) => s.lines.map((line, i) => ({ key: lineKey('s', s.id, i), line, title: s.title, level: s.level }))),
  ].filter((x) => x.line.t.includes(tag));
  return [...all].sort((a, b) => (log.items[b.key] ?? 0) - (log.items[a.key] ?? 0) || a.level - b.level);
}

/** 8 multiple-choice questions on the point: questions answered wrong before first, then the others mixed. */
export function reviewMcq(tag: string, seed: string): Mcq[] {
  const wrong = new Set(Object.keys(readWrong()));
  const items: Mcq[] = topicsOf(tag).flatMap((t) => t.items.map((x, i) => ({ id: `g:${t.id}:${i}`, q: x.q, o: x.o, a: x.a, w: x.w, label: t.title_vi })));
  const mixed = shuffle(items, seed);
  return [...mixed.filter((m) => wrong.has(m.id)), ...mixed.filter((m) => !wrong.has(m.id))].slice(0, REVIEW_SIZE);
}

/** For a point without multiple-choice questions (phrasal verbs…): 8 lines to translate. */
export function reviewLines(tag: string): WriteItem[] {
  return linesOf(tag)
    .slice(0, REVIEW_SIZE)
    .map((x, i) => ({ key: x.key, prompt: x.line.vi, en: x.line.en, hint: x.line.h, label: `${x.title} · câu ${i + 1}`, inflection: true, diagnose: x.line.t }));
}
