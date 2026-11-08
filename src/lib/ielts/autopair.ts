import type { AutoPair } from '../../../supabase/functions/_shared/p3-pairs.ts';
import { lineKey, normalize, type AutoKey } from './passage3';

export { lineKey, type AutoKey };

/**
 * Turning pasted questions into pairing exercises without the learner marking anything:
 * - with AI pairs (p3-pairs function): keywords are wrapped in the question text and a key remembers each partner,
 * - without AI: keywords are guessed (names, numbers and repeated words → already paired; other content words → to pair).
 */

/** `p` as it is written in the passage (same words, original spacing and case), or null. */
export function locate(passage: string, p: string): string | null {
  const words = p.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length || !words[0]) return null;
  const m = new RegExp(words.join('\\s+'), 'i').exec(passage);
  return m ? m[0] : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps the keywords of one question line: obvious pairs in {braces}, the others in [brackets]. Lines already marked are kept. */
export function markLine(line: string, pairs: AutoPair[]): string {
  const cells = line.split('||');
  let stem = cells[0] ?? '';
  if (/[[{]/.test(stem)) return line;
  for (const k of pairs) {
    if (k.q === '____') continue;
    const re = new RegExp(`(^|[^\\w[{])(${escape(k.q)})(?=$|[^\\w\\]}])`, 'i');
    stem = stem.replace(re, (_m, pre: string, w: string) => `${pre}${k.obvious ? `{${w}}` : `[${w}]`}`);
  }
  return [stem, ...cells.slice(1)].join('||');
}

/** Applies AI pairs to the whole questions box; returns the new text and the key for parseImport. */
export function applyPairs(questions: string, passage: string, pairs: AutoPair[][]): { text: string; key: AutoKey } {
  const key: AutoKey = {};
  const lines = questions.split('\n');
  let q = 0;
  const text = lines
    .map((line) => {
      if (!line.trim()) return line;
      const list = pairs[q++] ?? [];
      const marked = markLine(line, list);
      const entry: AutoKey[string] = {};
      for (const k of list) {
        const p = k.p ? locate(passage, k.p) : null;
        if (k.p && !p) continue;
        entry[k.q === '____' ? '____' : normalize(k.q)] = { p, vi: k.vi || undefined };
      }
      if (Object.keys(entry).length) key[lineKey(marked)] = entry;
      return marked;
    })
    .join('\n');
  return { text, key };
}

const STOP = new Set(
  `a an the and or but if of to in on at by for from with without into onto about as than then that this these those there their they them its it is are was were be been being has have had do does did not no nor can could may might must should would will shall which who whom whose what when where why how all any both each few more most other some such only own same so too very just also often usually many much one two first last new over under between after before during while because although though however therefore according writer passage text suggests says states believes`.split(
    /\s+/,
  ),
);

/**
 * No AI: marks the keywords it can guess. Names, numbers and content words that appear unchanged in the passage are
 * marked as already paired {…}; other content words become [keywords] for the learner to pair.
 */
export function guessLine(line: string, passage: string): string {
  const cells = line.split('||');
  const stem = cells[0] ?? '';
  if (/[[{]/.test(stem)) return line;
  const low = ` ${normalize(passage)} `;
  const inPassage = (w: string) => low.includes(` ${normalize(w)} `) || (w.length >= 6 && low.includes(` ${normalize(w).slice(0, w.length - 2)}`));
  let marked = 0;
  const out = stem.replace(/[A-Za-z][A-Za-z'-]*|\d[\d,.%]*/g, (w, at: number) => {
    const lw = w.toLowerCase();
    if (STOP.has(lw) || (w.length < 4 && !/\d/.test(w))) return w;
    if (marked >= 5) return w;
    marked++;
    const name = /^[A-Z]/.test(w) && at > 0;
    if (/\d/.test(w) || name || inPassage(w)) return `{${w}}`;
    return `[${w}]`;
  });
  return [out, ...cells.slice(1)].join('||');
}

export const guessAll = (questions: string, passage: string) =>
  questions
    .split('\n')
    .map((l) => (l.trim() ? guessLine(l, passage) : l))
    .join('\n');
