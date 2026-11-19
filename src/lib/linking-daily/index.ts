import data from '../../../content/daily/linking.json';
import type { Mcq } from '@/lib/practice-daily';
import type { WriteItem } from '@/lib/practice/items';
import { daysBetween } from '@/lib/roadmap/plan';

/**
 * Daily linking words: 6 multiple-choice gaps, then 2 sentence pairs to join with a given linking word and 2 sentences
 * that use one wrongly, to correct. Four levels: basic (and / but / so / because) → adding, contrast, result, examples
 * → despite / because of / whereas / instead of / unless → the linking words of an IELTS essay.
 * Questions answered wrong come back first on the following days (shared "answered wrong" list of the daily practice),
 * and every mistake counts towards the "Liên từ" grammar point.
 * Source text: content/daily/linking.txt (built by scripts/build-linking-daily.mjs).
 */

interface RawGroup {
  id: string;
  level: number;
  name: string;
  tip: string;
  mcq: { q: string; o: string[]; w: string }[];
  join: { a: string; b: string; use: string; en: string[]; w: string }[];
  fix: { wrong: string; en: string[]; w: string }[];
}
export const LINK_GROUPS = (data as { groups: RawGroup[] }).groups;

export const LINK_START = '2026-11-19';
export const LINK_LEVELS = [
  { n: 1, from: 0, name: 'Nối ý cơ bản', focus: 'and · but · so · because · or · first / then / finally · also / too' },
  { n: 2, from: 10, name: 'Thêm ý, đối lập, kết quả, ví dụ', focus: 'moreover · in addition · however · although · therefore · as a result · for example · such as' },
  { n: 3, from: 31, name: 'Danh từ hay mệnh đề', focus: 'despite / although · because of / because · whereas · instead of · unless · otherwise' },
  { n: 4, from: 59, name: 'Từ nối cho bài viết IELTS', focus: 'firstly · in conclusion · nevertheless · consequently · in other words · not only … but also · in order to' },
];
export const MCQ_PER_DAY = 6;
export const WRITE_PER_DAY = 4;

export const linkLevelOf = (date: string) => {
  const d = Math.max(0, daysBetween(LINK_START, date));
  return [...LINK_LEVELS].reverse().find((l) => d >= l.from)!.n;
};

/* ---------- items ---------- */

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

export interface LinkMcq extends Mcq {
  level: number;
}
export interface LinkWrite extends WriteItem {
  level: number;
}

export const LINK_MCQ: LinkMcq[] = LINK_GROUPS.flatMap((g) =>
  g.mcq.map((m, i) => {
    const id = `l:${g.id}:q${i}`;
    const o = shuffle(m.o, id);
    return { id, q: m.q, o, a: o.indexOf(m.o[0]!), w: m.w, label: g.name, level: g.level };
  }),
);

/** Join items start from the two sentences, to edit into one; fix items from the wrong sentence. */
export const LINK_WRITE: LinkWrite[] = LINK_GROUPS.flatMap((g) => [
  ...g.join.map((j, i) => ({
    key: `l:${g.id}:j${i}`,
    prompt: `${j.a} ${j.b}`,
    en: j.en,
    why: j.w,
    task: `Nối thành một câu, dùng “${j.use}”`,
    mustUse: j.use.includes('…') ? undefined : j.use,
    punctuation: true,
    label: g.name,
    level: g.level,
  })),
  ...g.fix.map((f, i) => ({ key: `l:${g.id}:f${i}`, prompt: f.wrong, en: f.en, why: f.w, task: 'Câu dùng từ nối sai — sửa lại cho đúng (chú ý cả dấu câu)', punctuation: true, label: g.name, level: g.level })),
]);

/* ---------- the day's set ---------- */

export type SeenLog = Record<string, string>;

/**
 * Wrong before first (up to a third), then items of the current level not seen for the longest time, then earlier
 * levels the same way. Within the same "last seen" the content order is kept, so a level is walked through in order.
 */
function choose<T>(items: T[], idOf: (x: T) => string, levelOf: (x: T) => number, n: number, level: number, wrong: Set<string>, seen: SeenLog): T[] {
  const open = items.filter((x) => levelOf(x) <= level);
  const out = open.filter((x) => wrong.has(idOf(x))).slice(0, Math.ceil(n / 3));
  const used = new Set(out.map(idOf));
  const byAge = (xs: T[]) => [...xs].sort((a, b) => (seen[idOf(a)] ?? '').localeCompare(seen[idOf(b)] ?? '') || items.indexOf(a) - items.indexOf(b));
  const current = byAge(open.filter((x) => levelOf(x) === level && !used.has(idOf(x))));
  const earlier = byAge(open.filter((x) => levelOf(x) < level && !used.has(idOf(x))));
  // mostly the current level; one in four from the earlier ones once there are some
  const fromEarlier = earlier.length ? Math.floor((n - out.length) / 4) : 0;
  out.push(...current.slice(0, n - out.length - fromEarlier));
  out.push(...earlier.slice(0, n - out.length));
  out.push(...current.filter((x) => !out.includes(x)).slice(0, n - out.length));
  return out;
}

export interface LinkSet {
  mcq: string[];
  write: string[];
}

export function pickLinking(date: string, wrongIds: string[], seen: SeenLog): LinkSet {
  const level = linkLevelOf(date);
  const wrong = new Set(wrongIds);
  const mcq = choose(LINK_MCQ, (m) => m.id, (m) => m.level, MCQ_PER_DAY, level, wrong, seen);
  const joins = choose(LINK_WRITE.filter((w) => w.key.includes(':j')), (w) => w.key, (w) => w.level, WRITE_PER_DAY / 2, level, wrong, seen);
  const fixes = choose(LINK_WRITE.filter((w) => w.key.includes(':f')), (w) => w.key, (w) => w.level, WRITE_PER_DAY / 2, level, wrong, seen);
  return { mcq: shuffle(mcq, `m${date}`).map((m) => m.id), write: [...joins, ...fixes].map((w) => w.key) };
}

const MCQ_BY_ID = new Map(LINK_MCQ.map((m) => [m.id, m]));
const WRITE_BY_KEY = new Map(LINK_WRITE.map((w) => [w.key, w]));
export const mcqOf = (set: LinkSet) => set.mcq.map((id) => MCQ_BY_ID.get(id)).filter((m): m is LinkMcq => Boolean(m));
export const writeOf = (set: LinkSet) => set.write.map((k) => WRITE_BY_KEY.get(k)).filter((w): w is LinkWrite => Boolean(w));

/* ---------- kept in this browser ---------- */

const SEEN_KEY = 'linking:seen:v1';

export function linkingSetFor(date: string, wrongIds: string[]): LinkSet {
  const key = `linking:set:${date}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as LinkSet;
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as SeenLog;
    const set = pickLinking(date, wrongIds, seen);
    for (const id of [...set.mcq, ...set.write]) seen[id] = date;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    localStorage.setItem(key, JSON.stringify(set));
    return set;
  } catch {
    return pickLinking(date, wrongIds, {});
  }
}

/** Score of the multiple-choice step, kept until the writing step is done. */
export interface StepResult {
  score: number;
  total: number;
  passed: boolean;
}
export const readStep = (date: string): StepResult | null => {
  try {
    return JSON.parse(localStorage.getItem(`linking:mcq:${date}`) ?? 'null') as StepResult | null;
  } catch {
    return null;
  }
};
export const saveStep = (date: string, r: StepResult) => {
  try {
    const old = readStep(date);
    if (!old || r.passed || r.score > old.score) localStorage.setItem(`linking:mcq:${date}`, JSON.stringify(old?.passed ? { ...r, passed: true } : r));
  } catch {
    /* private mode */
  }
};
