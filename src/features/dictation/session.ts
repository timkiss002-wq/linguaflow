import type { CompareResult } from '@/lib/compare';
import type { Hint } from '@/lib/compare/hint';

/** Per-sentence state during one dictation session. */
export interface Entry {
  input: string;
  result: CompareResult | null;
  checks: number;
  hints: number;
  lastHint: Hint | null;
  revealed: boolean;
  skipped: boolean;
  correct: boolean;
  /** True when the first check was already correct with no hints. */
  firstTry: boolean | null;
  bestAccuracy: number;
  startedAt: number;
}

export interface SessionState {
  index: number;
  entries: Record<string, Entry>;
  finished: boolean;
}

export type Action =
  | { type: 'input'; id: string; value: string }
  | { type: 'check'; id: string; result: CompareResult }
  | { type: 'hint'; id: string; hint: Hint }
  | { type: 'reveal'; id: string }
  | { type: 'skip'; id: string }
  | { type: 'goto'; index: number; now: number }
  | { type: 'finish' }
  | { type: 'reset'; index: number; now: number };

export const newEntry = (now: number): Entry => ({
  input: '',
  result: null,
  checks: 0,
  hints: 0,
  lastHint: null,
  revealed: false,
  skipped: false,
  correct: false,
  firstTry: null,
  bestAccuracy: 0,
  startedAt: now,
});

export const isDone = (e: Entry | undefined) => Boolean(e && (e.correct || e.revealed));

export function reducer(ids: string[]) {
  return (state: SessionState, action: Action): SessionState => {
    const entry = (id: string) => state.entries[id] ?? newEntry(Date.now());
    const put = (id: string, patch: Partial<Entry>) => ({ ...state, entries: { ...state.entries, [id]: { ...entry(id), ...patch } } });

    switch (action.type) {
      case 'input': {
        const e = entry(action.id);
        if (isDone(e)) return state; // answer locked once correct / revealed
        return put(action.id, { input: action.value });
      }
      case 'check': {
        const e = entry(action.id);
        if (isDone(e)) return state;
        const correct = action.result.isCorrect;
        return put(action.id, {
          result: action.result,
          checks: e.checks + 1,
          correct,
          skipped: false,
          firstTry: e.firstTry ?? (correct && e.hints === 0),
          bestAccuracy: Math.max(e.bestAccuracy, action.result.accuracy),
        });
      }
      case 'hint':
        if (isDone(entry(action.id))) return state;
        return put(action.id, { hints: entry(action.id).hints + 1, lastHint: action.hint, firstTry: entry(action.id).firstTry ?? false });
      case 'reveal':
        return put(action.id, { revealed: true, firstTry: entry(action.id).firstTry ?? false });
      case 'skip':
        if (isDone(entry(action.id))) return state;
        return { ...put(action.id, { skipped: true, firstTry: entry(action.id).firstTry ?? false }), index: Math.min(state.index + 1, ids.length - 1) };
      case 'goto': {
        const index = Math.max(0, Math.min(action.index, ids.length - 1));
        const id = ids[index]!;
        const entries = state.entries[id] ? state.entries : { ...state.entries, [id]: newEntry(action.now) };
        return { ...state, index, entries };
      }
      case 'finish':
        return { ...state, finished: true };
      case 'reset':
        return initialState(ids, action.index, action.now);
    }
  };
}

export function initialState(ids: string[], index: number, now: number): SessionState {
  const i = Math.max(0, Math.min(index, ids.length - 1));
  return { index: i, entries: ids[i] ? { [ids[i]!]: newEntry(now) } : {}, finished: false };
}

export interface SessionSummary {
  practised: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  /** Sentences not right on the first try (hints, several checks, revealed or skipped). */
  retryIds: string[];
}

export function summarizeSession(ids: string[], entries: Record<string, Entry>): SessionSummary {
  const touched = ids.filter((id) => {
    const e = entries[id];
    return e && (e.checks > 0 || e.revealed || e.skipped);
  });
  const correct = touched.filter((id) => entries[id]!.correct && !entries[id]!.revealed).length;
  const accuracy = touched.length
    ? Math.round((touched.reduce((sum, id) => sum + (entries[id]!.skipped && !entries[id]!.checks ? 0 : entries[id]!.bestAccuracy), 0) / touched.length) * 10) / 10
    : 0;
  return {
    practised: touched.length,
    correct,
    incorrect: touched.length - correct,
    accuracy,
    retryIds: touched.filter((id) => entries[id]!.firstTry !== true),
  };
}
