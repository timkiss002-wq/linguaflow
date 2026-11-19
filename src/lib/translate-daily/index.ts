import data from '../../../content/daily/translate.json';
import type { WriteItem } from '@/lib/practice/items';
import { daysBetween } from '@/lib/roadmap/plan';

/**
 * Daily translation (Vietnamese → English): 20 lines of everyday dialogue and one short story.
 *
 * - Six levels, two weeks each, so the grammar grows step by step: present simple → past / continuous → present
 *   perfect, comparison, modals → to V / V-ing, conditional 1, conjunctions → relative clauses, conditional 2,
 *   passive → everything mixed with natural phrases. Earlier levels stay in the mix.
 * - Every line is tagged with the grammar points it trains. A line wrong on the first try counts against its points,
 *   and comes back on later days; the day's set leans towards the points with the most mistakes, so the mistakes
 *   that repeat appear more and more until they stop.
 * Source text: content/daily/translate.txt (built into translate.json by scripts/build-translate-daily.mjs).
 */

export interface TLine {
  vi: string;
  en: string[];
  /** grammar points (TAGS) */
  t: string[];
  /** hint shown on request */
  h?: string;
}
export interface TPiece {
  id: string;
  level: number;
  scene: string;
  title: string;
  lines: TLine[];
}

const DATA = data as { tags: Record<string, { name: string; tip: string }>; dialogues: TPiece[]; stories: TPiece[] };
export const TAGS = DATA.tags;
export const DIALOGUES = DATA.dialogues;
export const STORIES = DATA.stories;

export const TRANSLATE_START = '2026-11-19';
export const LEVEL_DAYS = 14;
export const MAX_LEVEL = 6;
/** Lines of dialogue a day: 4 dialogues of 4 lines + 4 lines to review. */
export const DIALOGUES_PER_DAY = 4;
export const REVIEW_PER_DAY = 4;

export const LEVELS: { n: number; name: string; focus: string }[] = [
  { n: 1, name: 'Câu đơn hằng ngày', focus: 'Hiện tại đơn, to be, There is / are, số nhiều, câu hỏi với do / does' },
  { n: 2, name: 'Kể chuyện đã qua', focus: 'Quá khứ đơn, thì tiếp diễn, giới từ thời gian – nơi chốn, đếm được / không đếm được' },
  { n: 3, name: 'Kinh nghiệm & kế hoạch', focus: 'Hiện tại hoàn thành, so sánh, can / should / have to, will / be going to' },
  { n: 4, name: 'Nối ý, nêu lý do', focus: 'to V / V-ing, câu điều kiện loại 1, because / although / so / until / as soon as' },
  { n: 5, name: 'Câu dài hơn', focus: 'Mệnh đề quan hệ, câu điều kiện loại 2, câu bị động' },
  { n: 6, name: 'Nói tự nhiên', focus: 'Tổng hợp, câu tường thuật, cụm động từ và cách nói người bản xứ hay dùng' },
];

export const dayIndexOf = (date: string) => Math.max(0, daysBetween(TRANSLATE_START, date));
export const levelOf = (dayIndex: number) => Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, dayIndex) / LEVEL_DAYS));
/** Stories may run one level ahead of the dialogues, so there is a new story most days. */
export const storyLevelOf = (dayIndex: number) => Math.min(MAX_LEVEL, levelOf(dayIndex) + 1);

/* ---------- lines by key ---------- */

export const lineKey = (kind: 'd' | 's', id: string, i: number) => `${kind}:${id}:${i}`;
interface LineRef {
  key: string;
  line: TLine;
  piece: TPiece;
  kind: 'd' | 's';
  i: number;
}
const LINES = new Map<string, LineRef>();
for (const p of DIALOGUES) p.lines.forEach((line, i) => LINES.set(lineKey('d', p.id, i), { key: lineKey('d', p.id, i), line, piece: p, kind: 'd', i }));
for (const p of STORIES) p.lines.forEach((line, i) => LINES.set(lineKey('s', p.id, i), { key: lineKey('s', p.id, i), line, piece: p, kind: 's', i }));
export const lineByKey = (key: string) => LINES.get(key);

/* ---------- mistakes (kept in this browser) ---------- */

export interface ErrorLog {
  /** grammar point → weight of recent first-try mistakes */
  tags: Record<string, number>;
  /** line key → times wrong on the first try (removed once right on a later day) */
  items: Record<string, number>;
  /** `${date}|${key}` already counted, so a redo or a second visit doesn't count twice */
  logged: string[];
}
const ERR_KEY = 'translate:errors:v1';
export const emptyLog = (): ErrorLog => ({ tags: {}, items: {}, logged: [] });

export function readErrors(): ErrorLog {
  try {
    const v = JSON.parse(localStorage.getItem(ERR_KEY) ?? 'null') as ErrorLog | null;
    return v && v.tags && v.items && Array.isArray(v.logged) ? v : emptyLog();
  } catch {
    return emptyLog();
  }
}

/**
 * Counts the first try of each line once per day. Wrong: +1 on each of its grammar points and on the line itself.
 * Right: the line leaves the review list and its points lose a little weight, so a point fades once it is mastered.
 */
export function applyResults(log: ErrorLog, date: string, results: { key: string; ok: boolean }[]): ErrorLog {
  const next: ErrorLog = { tags: { ...log.tags }, items: { ...log.items }, logged: [...log.logged] };
  const seen = new Set(next.logged);
  for (const { key, ok } of results) {
    const tag = `${date}|${key}`;
    const ref = LINES.get(key);
    if (seen.has(tag) || !ref) continue;
    seen.add(tag);
    next.logged.push(tag);
    if (ok) {
      delete next.items[key];
      for (const t of ref.line.t) {
        const w = (next.tags[t] ?? 0) - 0.34;
        if (w > 0.01) next.tags[t] = Math.round(w * 100) / 100;
        else delete next.tags[t];
      }
    } else {
      next.items[key] = (next.items[key] ?? 0) + 1;
      for (const t of ref.line.t) next.tags[t] = (next.tags[t] ?? 0) + 1;
    }
  }
  next.logged = next.logged.slice(-3000);
  return next;
}

/**
 * The same weak-point log is shared with the daily multiple choice (lib/practice-daily): a grammar question answered
 * on its first try counts towards the grammar points of its topic, once per day, like a translated line.
 */
export function applyTagResult(log: ErrorLog, date: string, source: string, tags: string[], ok: boolean): ErrorLog {
  const tag = `${date}|${source}`;
  if (log.logged.includes(tag) || !tags.length) return log;
  const next: ErrorLog = { tags: { ...log.tags }, items: log.items, logged: [...log.logged, tag].slice(-3000) };
  for (const t of tags) {
    if (ok) {
      const w = (next.tags[t] ?? 0) - 0.34;
      if (w > 0.01) next.tags[t] = Math.round(w * 100) / 100;
      else delete next.tags[t];
    } else next.tags[t] = (next.tags[t] ?? 0) + 1;
  }
  return next;
}

export function recordTagResult(date: string, source: string, tags: string[], ok: boolean) {
  try {
    localStorage.setItem(ERR_KEY, JSON.stringify(applyTagResult(readErrors(), date, source, tags, ok)));
  } catch {
    /* private mode */
  }
}

export function recordResults(date: string, results: { key: string; ok: boolean }[]) {
  try {
    localStorage.setItem(ERR_KEY, JSON.stringify(applyResults(readErrors(), date, results)));
  } catch {
    /* private mode */
  }
}

/** The grammar points with the most mistakes, heaviest first. */
export function weakTags(log: ErrorLog, n = 5) {
  return Object.entries(log.tags)
    .filter(([t, w]) => TAGS[t] && w >= 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([id, w]) => ({ id, weight: w, ...TAGS[id]! }));
}

const lineWeight = (l: TLine, log: ErrorLog) => l.t.reduce((s, t) => s + (log.tags[t] ?? 0), 0);

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

/** When each dialogue / story was last given (id → date). */
export type SeenLog = Record<string, string>;

const ago = (seen: SeenLog, id: string, date: string) => (seen[id] ? daysBetween(seen[id]!, date) : Infinity);

export interface DialogueSet {
  dialogues: string[];
  /** line keys to review (wrong before, or training the weakest points) */
  review: string[];
  /** nothing to review yet: the first lines of one more dialogue fill the 20 */
  bonus?: string;
}

/**
 * The day's dialogues:
 * - 3 from the current level, the ones given least recently first (never given → first, in their order);
 * - 1 picked for the weakest points among every level open so far (not given in the last 3 days); with no mistakes
 *   yet, simply the next one of the current level;
 * - 4 review lines: lines answered wrong before (most often first), then lines of other dialogues that train the
 *   weakest points; when there is nothing to review yet, the first lines of one more dialogue.
 */
export function pickDialogues(date: string, log: ErrorLog, seen: SeenLog): DialogueSet {
  const day = dayIndexOf(date);
  const level = levelOf(day);
  const r = rng(seedOf(`t${date}`));
  const open = DIALOGUES.filter((d) => d.level <= level);
  const byRecency = (list: TPiece[]) =>
    [...list].sort((a, b) => {
      const sa = seen[a.id] ?? '';
      const sb = seen[b.id] ?? '';
      return sa < sb ? -1 : sa > sb ? 1 : DIALOGUES.indexOf(a) - DIALOGUES.indexOf(b);
    });
  const chosen: TPiece[] = byRecency(DIALOGUES.filter((d) => d.level === level)).slice(0, DIALOGUES_PER_DAY - 1);
  const has = (d: TPiece) => chosen.includes(d);
  const weak = open
    .filter((d) => !has(d) && ago(seen, d.id, date) > 3)
    .map((d) => ({ d, w: d.lines.reduce((s, l) => s + lineWeight(l, log), 0) + r() * 0.5 }))
    .sort((a, b) => b.w - a.w);
  const anyMistake = Object.keys(log.tags).length > 0;
  const extra = anyMistake && weak[0] ? weak[0].d : byRecency(open.filter((d) => !has(d)))[0];
  if (extra) chosen.push(extra);

  const inChosen = new Set(chosen.flatMap((d) => d.lines.map((_, i) => lineKey('d', d.id, i))));
  const review: string[] = [];
  const wrong = Object.entries(log.items)
    .filter(([k]) => {
      const ref = LINES.get(k);
      return ref && !inChosen.has(k) && ref.piece.level <= Math.max(level, storyLevelOf(day));
    })
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k);
  review.push(...wrong.slice(0, REVIEW_PER_DAY));
  if (review.length < REVIEW_PER_DAY && anyMistake) {
    const pool = open
      .filter((d) => !has(d))
      .flatMap((d) => d.lines.map((l, i) => ({ k: lineKey('d', d.id, i), w: lineWeight(l, log) + r() * 0.3 })))
      .filter((x) => x.w >= 1 && !review.includes(x.k))
      .sort((a, b) => b.w - a.w);
    review.push(...pool.slice(0, REVIEW_PER_DAY - review.length).map((x) => x.k));
  }
  const set: DialogueSet = { dialogues: chosen.map((d) => d.id), review };
  if (review.length < REVIEW_PER_DAY) {
    const more = byRecency(open.filter((d) => !has(d)))[0];
    if (more) set.bonus = more.id;
  }
  return set;
}

/**
 * The day's story: the first story (in order, up to one level above the dialogues) not finished yet; when every open
 * story is finished, the one finished longest ago comes back.
 */
export function pickStory(date: string, done: SeenLog): string {
  const open = STORIES.filter((s) => s.level <= storyLevelOf(dayIndexOf(date)));
  const fresh = open.find((s) => !done[s.id]);
  if (fresh) return fresh.id;
  return [...open].sort((a, b) => (done[a.id]! < done[b.id]! ? -1 : done[a.id]! > done[b.id]! ? 1 : 0))[0]!.id;
}

/* ---------- as exercise items ---------- */

const SPEAKER = ['A', 'B'];
const tagNames = (l: TLine) => l.t.map((t) => TAGS[t]?.name ?? t);
const why = (l: TLine) =>
  l.t
    .map((t) => TAGS[t])
    .filter(Boolean)
    .map((x) => `${x!.name}: ${x!.tip}`)
    .join('  ·  ');

function itemOf(ref: LineRef, label: string): WriteItem {
  const l = ref.line;
  return {
    key: ref.key,
    prompt: l.vi,
    en: l.en,
    hint: l.h ? `${l.h} · ${tagNames(l).join(', ')}` : `Điểm ngữ pháp: ${tagNames(l).join(', ')}`,
    why: why(l),
    label,
    scene: ref.piece.scene,
    inflection: true,
  };
}

export function dialogueItems(set: DialogueSet): WriteItem[] {
  const out: WriteItem[] = [];
  set.dialogues.forEach((id, n) => {
    const d = DIALOGUES.find((x) => x.id === id);
    if (!d) return;
    d.lines.forEach((_, i) => out.push(itemOf(LINES.get(lineKey('d', id, i))!, `Hội thoại ${n + 1} · ${d.title} · ${SPEAKER[i % 2]}`)));
  });
  const bonus = set.bonus ? DIALOGUES.find((x) => x.id === set.bonus) : undefined;
  bonus?.lines
    .slice(0, REVIEW_PER_DAY - set.review.length)
    .forEach((_, i) => out.push(itemOf(LINES.get(lineKey('d', bonus.id, i))!, `Hội thoại ${set.dialogues.length + 1} · ${bonus.title} · ${SPEAKER[i % 2]}`)));
  for (const k of set.review) {
    const ref = LINES.get(k);
    if (ref) out.push(itemOf(ref, ref.kind === 's' ? `Ôn lỗi · truyện “${ref.piece.title}”` : `Ôn lỗi · ${ref.piece.title}`));
  }
  return out;
}

export function storyItems(id: string): WriteItem[] {
  const s = STORIES.find((x) => x.id === id);
  if (!s) return [];
  return s.lines.map((_, i) => itemOf(LINES.get(lineKey('s', id, i))!, `${s.title} · câu ${i + 1}/${s.lines.length}`));
}

export const storyById = (id: string) => STORIES.find((s) => s.id === id);
export const dialogueById = (id: string) => DIALOGUES.find((d) => d.id === id);

/* ---------- kept in this browser ---------- */

const SEEN_KEY = 'translate:seen:v1';
const STORY_DONE_KEY = 'translate:stories:v1';

function readMap(key: string): SeenLog {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as SeenLog;
  } catch {
    return {};
  }
}
function writeMap(key: string, v: SeenLog) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}
export const readStoryDone = () => readMap(STORY_DONE_KEY);
export const markStoryDone = (id: string, date: string) => {
  const all = readStoryDone();
  if (!all[id] || all[id]! < date) writeMap(STORY_DONE_KEY, { ...all, [id]: date });
};

/** The set chosen the first time a day is opened stays the same for that day. */
function frozen<T>(key: string, make: () => T): T {
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

export function dialogueSetFor(date: string): DialogueSet {
  return frozen(`translate:set:${date}:dialogue`, () => {
    const seen = readMap(SEEN_KEY);
    const set = pickDialogues(date, readErrors(), seen);
    writeMap(SEEN_KEY, { ...seen, ...Object.fromEntries([...set.dialogues, ...(set.bonus ? [set.bonus] : [])].map((id) => [id, date])) });
    return set;
  });
}

export const storyFor = (date: string): string => frozen(`translate:set:${date}:story`, () => pickStory(date, readStoryDone()));

/** Where an exercise's run is kept (lib/practice/retry) and its best score (lib/practice/results). */
export const runKey = (date: string, kind: 'dialogue' | 'story') => `translate:run:${date}:${kind}`;
