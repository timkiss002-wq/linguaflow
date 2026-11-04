import { align, similarity, spellingSimilarity } from './align';
import { summarize, type CompareOptions, type CompareResult, type DiffToken } from './types';

interface Tok {
  text: string;
  norm: string;
  punct: boolean;
}

const TOKEN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;

export function tokenizeEnglish(text: string): Tok[] {
  const clean = text.normalize('NFKC').replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');
  return (clean.match(TOKEN) ?? []).map((t) => {
    const punct = !/[\p{L}\p{N}]/u.test(t);
    return { text: t, norm: punct ? t : t.toLowerCase(), punct };
  });
}

const noApostrophe = (s: string) => s.replace(/'/g, '');

/**
 * Word-level comparison. Case-insensitive; punctuation optional.
 * A substitution that is ≥ 75% similar (letter swaps count once) or differs only by an apostrophe
 * is a spelling mistake (yeers, recieve); otherwise it's a different word, usually misheard (walking/working).
 */
export function compareEnglish(expected: string, actual: string, opts: CompareOptions): CompareResult {
  let exp = tokenizeEnglish(expected);
  let act = tokenizeEnglish(actual);
  if (opts.ignorePunctuation) {
    exp = exp.filter((t) => !t.punct);
    act = act.filter((t) => !t.punct);
  }

  const ops = align(
    exp,
    act,
    (a, b) => a.norm === b.norm,
    (a, b) => (a.punct !== b.punct ? 5 : a.punct ? 0.5 : similarity(a.norm, b.norm) >= 0.6 ? 0.6 : 1),
  );

  const tokens: DiffToken[] = ops.map((o) => {
    switch (o.op) {
      case 'match':
        return { kind: 'correct', expected: o.a.text, actual: o.b.text, punct: o.a.punct };
      case 'del':
        return { kind: o.a.punct ? 'punctuation' : 'missing', expected: o.a.text, punct: o.a.punct };
      case 'ins':
        return { kind: o.b.punct ? 'punctuation' : 'extra', actual: o.b.text, punct: o.b.punct };
      case 'sub': {
        if (o.a.punct) return { kind: 'punctuation', expected: o.a.text, actual: o.b.text, punct: true };
        const close = noApostrophe(o.a.norm) === noApostrophe(o.b.norm) || spellingSimilarity(o.a.norm, o.b.norm) >= 0.75;
        return { kind: close ? 'misspelled' : 'wrong_word', expected: o.a.text, actual: o.b.text, punct: false };
      }
    }
  });
  return summarize(tokens, opts.ignorePunctuation);
}
