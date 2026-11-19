import { readProgress, readQuiz, PASS } from '@/lib/grammar/drills';
import { DAYS, GRAMMAR_SEQUENCE, previousTopic, todayKey, wordsOf, type Day, type Task } from './plan';
import { PRACTICE_KEY, practicePassed } from '@/lib/practice/results';
import { sentencesOf } from './sentences';

/**
 * What is done on the path. Ticks and retest results are kept in this browser (like the grammar and Passage 3
 * progress they build on); grammar tasks are read from the drills themselves, words from the notebook.
 */

export interface PlacementResult {
  date: string;
  grammar: [number, number];
  vocab: [number, number];
  reading: [number, number];
  minutes: number;
  writing: string[];
}

interface Store {
  done: Record<string, string>;
  placements: PlacementResult[];
}

const KEY = 'roadmap:v1';
let store: Store | null = null;
let version = 0;
const listeners = new Set<() => void>();

function read(): Store {
  if (store) return store;
  try {
    store = { done: {}, placements: [], ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Store>) };
  } catch {
    store = { done: {}, placements: [] };
  }
  return store;
}
function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode */
  }
  version++;
  listeners.forEach((l) => l());
}
export const subscribeRoadmap = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('roadmap:') || e.key?.startsWith('grammar:') || e.key?.startsWith('p3')) {
      store = null;
      version++;
      l();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
};
export const roadmapVersion = () => version;
/** Grammar and Passage 3 progress live in their own stores; call this after leaving one of their pages. */
export const refreshRoadmap = () => {
  version++;
  listeners.forEach((l) => l());
};

export function setManualDone(taskId: string, done: boolean) {
  const s = read();
  if (done) s.done[taskId] = new Date().toISOString();
  else delete s.done[taskId];
  write();
}
export const placements = () => read().placements;
export function savePlacement(r: PlacementResult) {
  read().placements.push(r);
  write();
}

/** Notebook state of one word: in the notebook, and practised at least once (typed in "Ôn từ vựng" or reviewed). */
export interface WordState {
  inNotebook: boolean;
  practised: boolean;
}
export type NotebookLookup = (term: string) => WordState;

export interface Context {
  notebook?: NotebookLookup;
  /** Passage 3 sets finished, with their date */
  p3Days: Set<string>;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
export const normaliseTerm = norm;

/** A grammar topic is passed when its quiz and its translation drill are each passed (≥ 80 % first try, or the wrong ones redone). */
export function topicState(topic: string) {
  const q = readQuiz()[topic];
  const d = readProgress()[topic];
  const quizOk = !!q && (Boolean(q.passed) || q.best / q.total >= PASS);
  const drillOk = !!d && (Boolean(d.passed) || d.best / d.total >= PASS);
  return { quiz: q, drill: d, quizOk, drillOk, passed: quizOk && drillOk };
}

/** The first grammar topic of the sequence not passed yet — the only one that can be worked on. */
export function currentTopic(): string | undefined {
  return GRAMMAR_SEQUENCE.find((t) => !topicState(t).passed);
}

export function isDone(task: Task, ctx: Context): boolean {
  const s = read();
  switch (task.kind) {
    case 'placement':
      return true;
    case 'grammar-learn':
      return topicState(task.topic!).quizOk;
    case 'grammar-drill':
      return topicState(task.topic!).drillOk;
    case 'vocab-new': {
      if (s.done[task.id]) return true;
      if (!ctx.notebook) return false;
      return wordsOf(task).every((w) => ctx.notebook!(w.t).practised);
    }
    case 'vocab-active':
      return Boolean(sentencesOf(task.id.slice(0, 10))?.passed);
    case 'vocab-translate':
    case 'grammar-fix':
    case 'grammar-svo':
    case 'wordform-week':
    case 'writing-week':
    case 'grammar-mcq':
    case 'reading-tfng':
    case 'translate-dialogue':
    case 'translate-story':
      return practicePassed(task.id);
    case 'reading-p3':
      return Boolean(s.done[task.id]) || ctx.p3Days.has(task.id.slice(0, 10));
    case 'retest':
      return Boolean(s.done[task.id]) || s.placements.some((p) => p.date >= task.id.slice(0, 10));
    case 'rest':
      return true;
    default:
      return Boolean(s.done[task.id]);
  }
}

/**
 * Days are not locked by the calendar: the path is linear, so a later day opens as soon as everything before it is done.
 * Today and past days are always open (unfinished work of past days shows first on "Hôm nay"). A future day opens when
 * nothing is owed from past days and every lesson of the days from today up to it is finished — daily habits
 * (card review, the short Passage 3, rest) don't count, they can't be done ahead.
 */
export function dayLock(day: Day, ctx: Context, today = todayKey()): string | undefined {
  if (day.date <= today) return undefined;
  const { owed, blocker } = openState(ctx, today);
  if (owed) return 'Làm bù việc của những ngày trước, rồi học tiếp được ngày này.';
  if (blocker && blocker.date < day.date) return `Học xong ngày ${blocker.date.slice(8, 10)}/${blocker.date.slice(5, 7)} trước rồi mới mở ngày này.`;
  return undefined;
}

/** Computed once per change of progress (the path page asks for every day): what is owed, and the first unfinished day from today. */
const openCache = new WeakMap<Context, { key: string; owed: number; blocker?: Day }>();
function openState(ctx: Context, today: string) {
  // grammar and sentence progress are written by their own pages without bumping `version`: include them in the key
  const raw = (k: string) => {
    try {
      return localStorage.getItem(k) ?? '';
    } catch {
      return '';
    }
  };
  const key = `${version}:${today}:${raw('grammar:progress')}:${raw('grammar:quiz')}:${raw('roadmap:sentences:v1')}:${raw(PRACTICE_KEY)}`;
  const hit = openCache.get(ctx);
  if (hit?.key === key) return hit;
  const state = { key, owed: backlog(ctx, today).length, blocker: DAYS.find((d) => d.date >= today && lessonsOf(d).some((t) => !isDone(t, ctx))) };
  openCache.set(ctx, state);
  return state;
}

/** The lessons of a day: what has to be finished before the next day opens. */
export const lessonsOf = (day: Day) => day.tasks.filter((t) => !DAILY_HABITS.includes(t.kind));

/** The first day after today that is not finished yet (the one to study ahead), if it is open. */
export function nextOpenDay(ctx: Context, today = todayKey()): Day | undefined {
  const next = DAYS.find((d) => d.date > today && lessonsOf(d).some((t) => !isDone(t, ctx)));
  return next && !dayLock(next, ctx, today) ? next : undefined;
}

/** Why a task cannot be started yet, or undefined. */
export function lockReason(task: Task, day: Day, ctx: Context, today = todayKey()): string | undefined {
  const locked = dayLock(day, ctx, today);
  if (locked) return locked;
  if (task.kind === 'grammar-learn' || task.kind === 'grammar-drill' || task.kind === 'grammar-own') {
    const prev = previousTopic(task.topic!);
    if (prev && !topicState(prev).passed) return 'Cần qua chủ điểm trước (nhận diện và dịch câu, mỗi phần ≥ 80%).';
    if (task.kind === 'grammar-drill' && !topicState(task.topic!).quizOk) return 'Làm phần nhận diện trước (≥ 80%).';
    if (task.kind === 'grammar-own' && !topicState(task.topic!).drillOk) return 'Qua phần dịch 8 câu trước (≥ 80%).';
  }
  if (task.kind === 'grammar-fix' && task.topic) {
    const prev = previousTopic(task.topic);
    if (prev && !topicState(prev).passed) return 'Cần qua chủ điểm trước (nhận diện và dịch câu, mỗi phần ≥ 80%).';
    if (!topicState(task.topic).quizOk) return 'Học lý thuyết + làm phần nhận diện của chủ điểm này trước (≥ 80%).';
  }
  return undefined;
}

export interface DayStatus {
  done: number;
  total: number;
  state: 'done' | 'partial' | 'missed' | 'today' | 'future' | 'empty';
}

export function dayStatus(day: Day, ctx: Context, today = todayKey()): DayStatus {
  const tasks = day.tasks.filter((t) => t.kind !== 'rest');
  const done = tasks.filter((t) => isDone(t, ctx)).length;
  const total = tasks.length;
  const state: DayStatus['state'] =
    total === 0 ? 'empty' : done === total ? 'done' : day.date > today ? 'future' : day.date === today ? 'today' : done ? 'partial' : 'missed';
  return { done, total, state };
}

/** Habits that don't pile up when a day is missed: today's review replaces yesterday's. */
const DAILY_HABITS: Task['kind'][] = ['rest', 'vocab-review', 'reading-p3', 'setup'];

/** Unfinished tasks of past days, oldest first: the path is linear, so these come before today's. */
export function backlog(ctx: Context, today = todayKey()): { day: Day; task: Task }[] {
  return DAYS.filter((d) => d.date < today).flatMap((day) => day.tasks.filter((t) => !DAILY_HABITS.includes(t.kind) && !isDone(t, ctx)).map((task) => ({ day, task })));
}

/** Link that opens a task (a grammar drill opens straight on the translation step). */
export function hrefFor(task: Task) {
  if (task.kind === 'grammar-drill') return `${task.href}?step=drill`;
  return task.href;
}

/** A task the learner can open right now: has a page, isn't done, isn't waiting on an earlier step. */
export function isStartable(task: Task, day: Day, ctx: Context) {
  return Boolean(task.href) && task.kind !== 'rest' && !isDone(task, ctx) && !lockReason(task, day, ctx);
}
