import data from '../../../content/daily/argue.json';
import type { Mcq } from '@/lib/practice-daily';
import { daysBetween } from '@/lib/roadmap/plan';

/**
 * Daily argument skills for IELTS Writing: put the sentences of one body paragraph in order (point → explanation →
 * example → link, or other view → reason → rebuttal → example → link), then 4 questions on topic sentences,
 * fitting examples, weak arguments, hedging (may, tend to, it could be argued), signposting and counter-arguments.
 * Three levels of four weeks: basic PEEL → careful claims and stronger reasoning → concession and rebuttal.
 * Source text: content/daily/argue.txt (built by scripts/build-argue-daily.mjs).
 */

export type Role = 'P' | 'E' | 'X' | 'L' | 'O' | 'R';
export interface Paragraph {
  id: string;
  level: number;
  scene: string;
  topic: string;
  prompt: string;
  s: { r: Role; t: string }[];
}
interface RawQ {
  kind: string;
  level: number;
  q: string;
  o: string[];
  w: string;
}
const DATA = data as { paragraphs: Paragraph[]; questions: RawQ[] };
export const PARAGRAPHS = DATA.paragraphs;

export const ROLE_INFO: Record<Role, { name: string; tip: string }> = {
  P: { name: 'Ý chính', tip: 'Câu chủ đề: trả lời thẳng đề bài bằng một ý rõ ràng.' },
  E: { name: 'Giải thích', tip: 'Vì sao ý chính đúng: lý do, cơ chế (because, since, which means…).' },
  X: { name: 'Ví dụ', tip: 'Bằng chứng cụ thể: số liệu, nơi chốn, trường hợp (For example, In Japan…).' },
  L: { name: 'Câu kết đoạn', tip: 'Nối lại về đề / kết luận nhỏ (Therefore, For this reason…), không mở ý mới.' },
  O: { name: 'Ý kiến trái chiều', tip: 'Nêu khách quan quan điểm của phía kia (Some people argue that…).' },
  R: { name: 'Phản bác', tip: 'Đáp lại phía kia (However, Nevertheless, Admittedly … however…).' },
};

export const KIND_LABEL: Record<string, string> = {
  topic: 'Câu chủ đề',
  example: 'Ví dụ phù hợp',
  weak: 'Nhận ra lập luận yếu',
  hedge: 'Nói giảm, thận trọng',
  signpost: 'Câu dẫn dắt',
  link: 'Câu kết đoạn',
  counter: 'Phản biện, nhượng bộ',
};

export const ARGUE_START = '2026-11-19';
export const ARGUE_LEVELS = [
  { n: 1, from: 0, name: 'Đoạn PEEL cơ bản', focus: 'Câu chủ đề rõ ràng, giải thích, ví dụ đúng ý, câu kết đoạn nối về đề.' },
  { n: 2, from: 28, name: 'Lập luận chặt, nói giảm', focus: 'may / tend to / is likely to / it could be argued; nhận ra khái quát hoá, nguyên nhân sai, ví dụ yếu.' },
  { n: 3, from: 56, name: 'Phản biện & nhượng bộ', focus: 'Some people argue that… However…; Admittedly…; On balance…; mở bài và kết luận cho cả hai phía.' },
];
export const QUESTIONS_PER_DAY = 4;
export const argueLevelOf = (date: string) => {
  const d = Math.max(0, daysBetween(ARGUE_START, date));
  return [...ARGUE_LEVELS].reverse().find((l) => d >= l.from)!.n;
};

function seedOf(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function shuffleSeeded<T>(list: T[], seed: string): T[] {
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
  // never the right order
  if (a.length > 1 && a.every((v, i) => v === list[i])) a.push(a.shift()!);
  return a;
}

export interface ArgueMcq extends Mcq {
  level: number;
  kind: string;
}
export const ARGUE_MCQ: ArgueMcq[] = DATA.questions.map((x, i) => {
  const id = `a:q${i}`;
  const o = shuffleSeeded(x.o, id);
  return { id, q: x.q, o, a: o.indexOf(x.o[0]!), w: x.w, label: KIND_LABEL[x.kind] ?? x.kind, level: x.level, kind: x.kind };
});

export type SeenLog = Record<string, string>;
const byAge = <T>(xs: T[], id: (x: T) => string, seen: SeenLog, all: T[]) =>
  [...xs].sort((a, b) => (seen[id(a)] ?? '').localeCompare(seen[id(b)] ?? '') || all.indexOf(a) - all.indexOf(b));

export interface ArgueSet {
  paragraph: string;
  questions: string[];
}

/** One paragraph (current level, least recently done first) and 4 questions (wrong before → current level → earlier). */
export function pickArgue(date: string, wrongIds: string[], seen: SeenLog): ArgueSet {
  const level = argueLevelOf(date);
  const paras = PARAGRAPHS.filter((p) => p.level === level);
  const paragraph = byAge(paras, (p) => p.id, seen, PARAGRAPHS)[0]!.id;
  const open = ARGUE_MCQ.filter((q) => q.level <= level);
  const wrong = new Set(wrongIds);
  const out = open.filter((q) => wrong.has(q.id)).slice(0, 1);
  const used = new Set(out.map((q) => q.id));
  const current = byAge(open.filter((q) => q.level === level && !used.has(q.id)), (q) => q.id, seen, ARGUE_MCQ);
  const earlier = byAge(open.filter((q) => q.level < level && !used.has(q.id)), (q) => q.id, seen, ARGUE_MCQ);
  // varied kinds: take the oldest of each kind first
  const kinds = new Set(out.map((q) => q.kind));
  for (const q of current) {
    if (out.length < QUESTIONS_PER_DAY - (earlier.length ? 1 : 0) && !kinds.has(q.kind)) {
      out.push(q);
      kinds.add(q.kind);
    }
  }
  for (const q of earlier) if (out.length < QUESTIONS_PER_DAY && !out.includes(q)) out.push(q);
  for (const q of current) if (out.length < QUESTIONS_PER_DAY && !out.includes(q)) out.push(q);
  return { paragraph, questions: out.map((q) => q.id) };
}

const Q_BY_ID = new Map(ARGUE_MCQ.map((q) => [q.id, q]));
export const questionsOf = (set: ArgueSet) => set.questions.map((id) => Q_BY_ID.get(id)).filter((q): q is ArgueMcq => Boolean(q));
export const paragraphById = (id: string) => PARAGRAPHS.find((p) => p.id === id);

const SEEN_KEY = 'argue:seen:v1';
export function argueSetFor(date: string, wrongIds: string[]): ArgueSet {
  const key = `argue:set:${date}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as ArgueSet;
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as SeenLog;
    const set = pickArgue(date, wrongIds, seen);
    for (const id of [set.paragraph, ...set.questions]) seen[id] = date;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    localStorage.setItem(key, JSON.stringify(set));
    return set;
  } catch {
    return pickArgue(date, wrongIds, {});
  }
}

/** Ordering step: right on the first check, and finished (right in the end). */
export interface OrderResult {
  firstTry: boolean;
  done: boolean;
}
export const readOrder = (date: string): OrderResult | null => {
  try {
    return JSON.parse(localStorage.getItem(`argue:order:${date}`) ?? 'null') as OrderResult | null;
  } catch {
    return null;
  }
};
export const saveOrder = (date: string, r: OrderResult) => {
  try {
    const old = readOrder(date);
    localStorage.setItem(`argue:order:${date}`, JSON.stringify(old ? { firstTry: old.firstTry, done: old.done || r.done } : r));
  } catch {
    /* private mode */
  }
};
