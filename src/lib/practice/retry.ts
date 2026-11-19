/**
 * Pass rule shared by every practice exercise of the path:
 *
 * - "Graded" sentences (active vocabulary, grammar, S-V-O, word form…) are scored on the FIRST try of the first round.
 *   At ≥ 50 % first-try right the exercise is passed. Below 50 %, only the graded sentences that were wrong the first
 *   time have to be redone — never the whole exercise — and each counts once it is right on the first try of a redo.
 * - "Ungraded" sentences (passive vocabulary) only have to be right in the end, however many tries it takes; a wrong
 *   one comes back in the redo round until it is right.
 *
 * Progress of a run is kept in this browser, so leaving the page halfway doesn't lose the first-try results.
 */

export const PASS_RATE = 0.5;

export interface RunItem {
  key: string;
  /** false: passive vocabulary — only has to be right in the end (default true) */
  graded?: boolean;
}

export interface RunState {
  /** first round: key → right (graded: on the first try · ungraded: in the end) */
  first: Record<string, boolean>;
  /** keys redone right in a later round */
  fixed: string[];
}

export const emptyRun = (): RunState => ({ first: {}, fixed: [] });

const graded = (i: RunItem) => i.graded !== false;

/** First-try score of the graded sentences of the first round. */
export function firstScore(items: RunItem[], st: RunState) {
  const g = items.filter(graded);
  return { score: g.filter((i) => st.first[i.key]).length, total: g.length };
}

/** Whether every sentence has been through the first round. */
export const firstRoundDone = (items: RunItem[], st: RunState) =>
  items.every((i) => i.key in st.first);

/** Keys still to redo before the exercise is passed. */
export function toRedo(items: RunItem[], st: RunState): string[] {
  const { score, total } = firstScore(items, st);
  const rateOk = total === 0 || score / total >= PASS_RATE;
  return items
    .filter(
      (i) => i.key in st.first && !st.first[i.key] && !st.fixed.includes(i.key),
    )
    .filter((i) => !graded(i) || !rateOk)
    .map((i) => i.key);
}

/** Wrong the first time and not redone yet (optional to practise once the exercise is passed). */
export const stillWrong = (items: RunItem[], st: RunState) =>
  items
    .filter(
      (i) => i.key in st.first && !st.first[i.key] && !st.fixed.includes(i.key),
    )
    .map((i) => i.key);

export const runPassed = (items: RunItem[], st: RunState) =>
  items.length > 0 &&
  firstRoundDone(items, st) &&
  toRedo(items, st).length === 0;

/**
 * Records one sentence. `firstTry`: right on its first try in this round; `ok`: right in the end.
 * In the first round a graded sentence keeps its first try, an ungraded one whether it ended right.
 * In a redo round a graded sentence counts when right on the first try of the redo, an ungraded one when right at all.
 */
export function record(
  st: RunState,
  item: RunItem,
  firstRound: boolean,
  firstTry: boolean,
  ok: boolean,
): RunState {
  const good = graded(item) ? firstTry : ok;
  if (firstRound) return { ...st, first: { ...st.first, [item.key]: good } };
  if (!good || st.fixed.includes(item.key)) return st;
  return { ...st, fixed: [...st.fixed, item.key] };
}

/* ---------- kept in this browser ---------- */

const KEY = "practice:runs:v1";

function readAll(): Record<string, RunState> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<
      string,
      RunState
    >;
  } catch {
    return {};
  }
}

/** The saved run of an exercise, if its sentences are still the same. */
export function loadRun(id: string, items: RunItem[]): RunState {
  const st = readAll()[id];
  if (!st || !st.first || !Array.isArray(st.fixed)) return emptyRun();
  const keys = new Set(items.map((i) => i.key));
  if (Object.keys(st.first).some((k) => !keys.has(k))) return emptyRun();
  return st;
}

export function saveRun(id: string, st: RunState) {
  const all = readAll();
  all[id] = st;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
