import { useCallback, useState } from 'react';

/** Exam-room settings, like the "Settings" menu of the computer-delivered IELTS: text size, colours, volume, timer warning. */
export type TextSize = 'sm' | 'md' | 'lg';
export type ExamTheme = 'standard' | 'cream' | 'contrast';

export interface ExamPrefs {
  size: TextSize;
  theme: ExamTheme;
  /** listening volume, 0–1 */
  volume: number;
  /** blink the clock when 10 and 5 minutes are left */
  blink: boolean;
  /** width of the left pane, % of the screen */
  split: number;
}

export const DEFAULT_PREFS: ExamPrefs = { size: 'md', theme: 'standard', volume: 1, blink: true, split: 52 };
const KEY = 'exam:prefs';

export function readPrefs(): ExamPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    // older key, kept so a chosen text size is not lost
    const oldSize = localStorage.getItem('ielts:text-size') as TextSize | null;
    const saved = raw ? (JSON.parse(raw) as Partial<ExamPrefs>) : {};
    return { ...DEFAULT_PREFS, ...(oldSize ? { size: oldSize } : {}), ...saved };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useExamPrefs() {
  const [prefs, setPrefs] = useState<ExamPrefs>(readPrefs);
  const update = useCallback((patch: Partial<ExamPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);
  return [prefs, update] as const;
}

export const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`;

/** The clock blinks for 10 seconds when 10 and then 5 minutes are left, as in the real test. */
export const isBlinking = (left: number) => (left <= 600 && left > 590) || (left <= 300 && left > 290);

/** True while the learner is typing, so single-key shortcuts don't steal letters or arrows. */
export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
