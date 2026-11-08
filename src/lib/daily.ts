/**
 * "Bài tập hằng ngày": which of today's tasks are done (reading · writing · listening), kept on this device.
 * Kept separate from the reading content so pages that only mark a task done stay small.
 */

export type DailyTask = 'reading' | 'writing' | 'listening';

const KEY = 'lf.daily.v1';

export const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA');

type Log = Record<string, DailyTask[]>;

function read(): Log {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Log;
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let version = 0;
export const subscribeDaily = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const dailyVersion = () => version;

export function markDailyDone(task: DailyTask, day = dayKey()) {
  const log = read();
  const list = log[day] ?? [];
  if (list.includes(task)) return;
  log[day] = [...list, task];
  // keep a year at most
  const days = Object.keys(log).sort();
  for (const d of days.slice(0, Math.max(0, days.length - 366))) delete log[d];
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* private mode */
  }
  version++;
  listeners.forEach((l) => l());
}

export const dailyDone = (day = dayKey()): DailyTask[] => read()[day] ?? [];

/** Days on which at least one daily task was done. */
export const activeDays = (): string[] => Object.keys(read()).filter((d) => (read()[d] ?? []).length > 0);

/** A pick that stays the same all day (and changes with `shift`, for "đổi bài khác"). */
export function pickForDay<T>(list: T[], salt: string, shift = 0, day = dayKey()): T | undefined {
  if (!list.length) return undefined;
  let h = 2166136261;
  for (const c of `${day}|${salt}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return list[((h >>> 0) + shift) % list.length];
}
