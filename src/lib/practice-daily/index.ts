import familiesJson from '../../../content/word-families.json';
import grammarJson from '../../../content/daily/grammar-mcq.json';
import tfngJson from '../../../content/daily/tfng.json';

/**
 * Daily multiple choice (grammar + word form) and short True / False / Not Given passages.
 * Grammar topics open one after another by date (foundation first: be, tenses, nouns, articles, sentence patterns…),
 * so each day mixes the newest topic with review of the earlier ones and the questions answered wrong before.
 * The amount grows with the phase of the path: the closer to the exam, the more practice.
 */

export interface Mcq {
  /** stable id, used for the "answered wrong before" list */
  id: string;
  q: string;
  o: string[];
  a: number;
  w: string;
  /** small label: topic or word family */
  label: string;
}
interface GrammarTopic {
  id: string;
  title_vi: string;
  from: string;
  tip_vi: string;
  items: { q: string; o: string[]; a: number; w: string }[];
}
export interface TfngStatement {
  s: string;
  a: 'T' | 'F' | 'NG';
  w: string;
  ev?: string;
}
export interface TfngPassage {
  id: string;
  title: string;
  text: string;
  q: TfngStatement[];
}

export const DAILY_START = '2026-11-19';
export const GRAMMAR_TOPICS = (grammarJson as { topics: GrammarTopic[] }).topics;
export const TFNG_PASSAGES = (tfngJson as { passages: TfngPassage[] }).passages;

/** How much each day asks for, by phase of the path (1 foundation · 2 practice · 3 mock tests). */
export function dailyAmount(phase: number) {
  if (phase >= 3) return { grammar: 20, wordForm: 10, passages: 3 };
  if (phase === 2) return { grammar: 15, wordForm: 8, passages: 2 };
  return { grammar: 10, wordForm: 5, passages: 1 };
}

/* ---------- deterministic choice per date ---------- */

function seedOf(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function shuffle<T>(list: T[], r: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ---------- grammar ---------- */

const grammarItems = (t: GrammarTopic): Mcq[] => t.items.map((x, i) => ({ id: `g:${t.id}:${i}`, q: x.q, o: x.o, a: x.a, w: x.w, label: t.title_vi }));

/** Topics open on a date (always at least the first one). */
export function openTopics(date: string) {
  const open = GRAMMAR_TOPICS.filter((t) => t.from <= date);
  return open.length ? open : GRAMMAR_TOPICS.slice(0, 1);
}

/** The topic that opened most recently: half of the day's questions come from it while it is new. */
export const currentTopic = (date: string) => openTopics(date).at(-1)!;

const ALL_MCQ = new Map<string, Mcq>();
for (const t of GRAMMAR_TOPICS) for (const m of grammarItems(t)) ALL_MCQ.set(m.id, m);

/**
 * The day's grammar questions: up to a third from questions answered wrong on earlier days, about half from the
 * newest topic (all of it in the final phase is mixed), the rest spread over the earlier topics.
 */
export function grammarSet(date: string, phase: number, wrongIds: string[] = []): Mcq[] {
  const n = dailyAmount(phase).grammar;
  const r = rng(seedOf(`g${date}`));
  const open = openTopics(date);
  const allowed = new Set(open.flatMap((t) => grammarItems(t).map((m) => m.id)));
  const review = shuffle(
    wrongIds.filter((id) => allowed.has(id)),
    r,
  )
    .slice(0, Math.floor(n / 3))
    .map((id) => ALL_MCQ.get(id)!);
  const used = new Set(review.map((m) => m.id));
  const cur = currentTopic(date);
  // only one topic open: all from it · final phase: everything mixed · otherwise: half from the newest topic
  const newShare = open.length === 1 ? n : phase >= 3 ? 0 : Math.ceil(n / 2);
  const fresh = shuffle(grammarItems(cur), r)
    .filter((m) => !used.has(m.id))
    .slice(0, newShare);
  for (const m of fresh) used.add(m.id);
  const rest = shuffle(
    open.flatMap((t) => grammarItems(t)),
    r,
  ).filter((m) => !used.has(m.id));
  return shuffle([...review, ...fresh, ...rest].slice(0, n), r);
}

/* ---------- word form (from the word families) ---------- */

interface Family {
  h: string;
  m: [string, string, string][];
  x: [string, string][];
}
const FAMILIES = (familiesJson as unknown as { families: Family[] }).families;
const POS_VI: Record<string, string> = { n: 'danh từ', v: 'động từ', adj: 'tính từ', adv: 'trạng từ' };

/** Every example sentence of every family as a 4-option question: the answer and other members of its family. */
export const WORD_FORM_MCQ: Mcq[] = FAMILIES.flatMap((f) =>
  f.x.flatMap(([sentence, why], i) => {
    const m = /\[([^\]]+)\]/.exec(sentence);
    if (!m) return [];
    const answer = m[1]!;
    const others = [...new Set(f.m.map((x) => x[0]))].filter((w) => w.toLowerCase() !== answer.toLowerCase());
    if (others.length < 2) return [];
    const r = rng(seedOf(`${f.h}${i}`));
    const options = shuffle([answer, ...shuffle(others, r).slice(0, 3)], r);
    const pos = f.m.find((x) => x[0].toLowerCase() === answer.toLowerCase())?.[1];
    return [
      {
        id: `w:${f.h}:${i}`,
        q: sentence.replace(m[0], '___'),
        o: options,
        a: options.indexOf(answer),
        w: `${answer}${pos && POS_VI[pos] ? ` (${POS_VI[pos]})` : ''}: ${why}`,
        label: `Word form · ${f.h}`,
      },
    ];
  }),
);
const WF_BY_ID = new Map(WORD_FORM_MCQ.map((m) => [m.id, m]));

/** The day's word-form questions, walking through the families in order (wrong ones come back first). */
export function wordFormSet(date: string, phase: number, dayIndex: number, wrongIds: string[] = []): Mcq[] {
  const n = dailyAmount(phase).wordForm;
  const r = rng(seedOf(`w${date}`));
  const review = shuffle(
    wrongIds.filter((id) => WF_BY_ID.has(id)),
    r,
  )
    .slice(0, Math.floor(n / 2))
    .map((id) => WF_BY_ID.get(id)!);
  const used = new Set(review.map((m) => m.id));
  const start = (dayIndex * n) % WORD_FORM_MCQ.length;
  const ring = [...WORD_FORM_MCQ.slice(start), ...WORD_FORM_MCQ.slice(0, start)].filter((m) => !used.has(m.id));
  return [...review, ...ring].slice(0, n);
}

/* ---------- True / False / Not Given ---------- */

/** The day's passages, in order, never the same passage twice on one day. */
export function tfngSet(phase: number, dayIndex: number): TfngPassage[] {
  const k = dailyAmount(phase).passages;
  const out: TfngPassage[] = [];
  for (let j = 0; j < k; j++) out.push(TFNG_PASSAGES[(dayIndex * k + j) % TFNG_PASSAGES.length]!);
  return out;
}

export const TFNG_LABEL: Record<TfngStatement['a'], string> = { T: 'TRUE', F: 'FALSE', NG: 'NOT GIVEN' };

/* ---------- questions answered wrong (kept in this browser) ---------- */

const WRONG_KEY = 'daily:wrong:v1';

export function readWrong(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(WRONG_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

/** Wrong on the first try → comes back on later days; right on a later day → leaves the list. */
export function recordAnswer(id: string, firstTryCorrect: boolean) {
  try {
    const all = readWrong();
    if (firstTryCorrect) delete all[id];
    else all[id] = (all[id] ?? 0) + 1;
    localStorage.setItem(WRONG_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

/** The set chosen the first time a day is opened stays the same for that day, even after the wrong list changes. */
export function frozenSet<T>(key: string, make: () => T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
    const v = make();
    localStorage.setItem(key, JSON.stringify(v));
    return v;
  } catch {
    return make();
  }
}
