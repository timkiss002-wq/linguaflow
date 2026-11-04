export type ErrorKind =
  | 'missing' // expected unit not typed
  | 'extra' // typed but not in the answer
  | 'misspelled' // EN: close to the right word (spelling)
  | 'wrong_word' // EN: a different word (misheard)
  | 'word_form' // EN: another form of the same word family (decision → decisive)
  | 'wrong_character' // ZH: same sound incl. tone, wrong character (writing error)
  | 'tone' // ZH: right syllable, wrong tone
  | 'misheard' // ZH: different syllable (listening error)
  | 'punctuation';

export type TokenKind = 'correct' | ErrorKind;

export interface DiffToken {
  kind: TokenKind;
  /** Text from the answer key (absent for extra tokens). */
  expected?: string;
  /** What the learner typed (absent for missing tokens). */
  actual?: string;
  punct: boolean;
}

export interface CompareResult {
  tokens: DiffToken[];
  counts: Record<ErrorKind, number>;
  /** 0–100, one decimal. Punctuation never affects it. */
  accuracy: number;
  isCorrect: boolean;
  expectedUnits: number;
  correctUnits: number;
  /** [expected, typed] pairs for substitutions — feeds "common confusions" analysis later. */
  confusions: [string, string][];
}

export interface CompareOptions {
  ignorePunctuation: boolean;
  /** EN: true when two different words belong to the same word family (enables 'word_form'). */
  sameFamily?: (a: string, b: string) => boolean;
}

export const emptyCounts = (): Record<ErrorKind, number> => ({
  missing: 0,
  extra: 0,
  misspelled: 0,
  wrong_word: 0,
  word_form: 0,
  wrong_character: 0,
  tone: 0,
  misheard: 0,
  punctuation: 0,
});

export function summarize(tokens: DiffToken[], ignorePunctuation: boolean): CompareResult {
  const counts = emptyCounts();
  const confusions: [string, string][] = [];
  let expectedUnits = 0;
  let correctUnits = 0;
  let extraUnits = 0;
  for (const t of tokens) {
    if (t.kind !== 'correct') counts[t.kind] += 1;
    if (t.punct) continue;
    if (t.expected !== undefined) expectedUnits += 1;
    if (t.kind === 'correct') correctUnits += 1;
    if (t.kind === 'extra') extraUnits += 1;
    if (t.expected !== undefined && t.actual !== undefined && t.kind !== 'correct') confusions.push([t.expected, t.actual]);
  }
  if (ignorePunctuation) counts.punctuation = 0;
  const denom = expectedUnits + extraUnits;
  const accuracy = denom === 0 ? 100 : Math.round((correctUnits / denom) * 1000) / 10;
  const errors = Object.entries(counts).reduce((n, [k, v]) => (k === 'punctuation' && ignorePunctuation ? n : n + v), 0);
  return { tokens, counts, accuracy, isCorrect: errors === 0, expectedUnits, correctUnits, confusions: confusions.slice(0, 20) };
}
