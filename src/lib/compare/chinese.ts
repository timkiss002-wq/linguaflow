import { pinyin } from 'pinyin-pro';
import { align } from './align';
import { summarize, type CompareOptions, type CompareResult, type DiffToken } from './types';

const HAN = /\p{Script=Han}/u;
const PUNCT = /[\p{P}\p{S}]/u;

// Fold the punctuation variants learners type with different IMEs/keyboards.
const PUNCT_MAP: Record<string, string> = {
  '。': '.', '．': '.', '、': ',', '，': ',', '“': '"', '”': '"', '‘': "'", '’': "'",
  '《': '<', '》': '>', '〈': '<', '〉': '>', '「': '"', '」': '"', '『': '"', '』': '"', '…': '...', '～': '~', '—': '-',
};

interface Tok {
  ch: string;
  han: boolean;
  punct: boolean;
}

export function tokenizeChinese(text: string): Tok[] {
  return [...[...text.normalize('NFKC')].map((c) => PUNCT_MAP[c] ?? c).join('')]
    .filter((c) => !/\s/.test(c))
    .map((c) => ({ ch: c.toLowerCase(), han: HAN.test(c), punct: PUNCT.test(c) && !HAN.test(c) }));
}

const toneless = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'v');

function readings(ch: string): string[] {
  return pinyin(ch, { multiple: true, type: 'array' });
}

/** Contextual pinyin per character of the expected sentence (handles 多音字). */
function contextualPinyin(toks: Tok[]): string[] {
  const arr = pinyin(toks.map((t) => t.ch).join(''), { type: 'array', nonZh: 'spaced' });
  // pinyin-pro returns one entry per character for Han; keep indexes aligned defensively.
  return toks.length === arr.length ? arr : toks.map((t) => (t.han ? (readings(t.ch)[0] ?? '') : ''));
}

/**
 * Character-level comparison for Chinese.
 * Substituted characters are classified by sound:
 *   same pinyin incl. tone → wrong_character (heard correctly, picked the wrong character),
 *   same syllable, other tone → tone,
 *   different syllable → misheard.
 */
export function compareChinese(expected: string, actual: string, opts: CompareOptions): CompareResult {
  let exp = tokenizeChinese(expected);
  let act = tokenizeChinese(actual);
  if (opts.ignorePunctuation) {
    exp = exp.filter((t) => !t.punct);
    act = act.filter((t) => !t.punct);
  }
  const expPy = contextualPinyin(exp);
  const expIndex = new Map(exp.map((t, i) => [t, i]));

  const sameSyllable = (a: Tok, b: Tok) => {
    const p = expPy[expIndex.get(a)!] ?? '';
    return readings(b.ch).some((r) => toneless(r) === toneless(p));
  };

  const ops = align(
    exp,
    act,
    (a, b) => a.ch === b.ch,
    (a, b) => (a.punct !== b.punct ? 5 : a.punct ? 0.5 : a.han && b.han && sameSyllable(a, b) ? 0.6 : 1),
  );

  const tokens: DiffToken[] = ops.map((o) => {
    switch (o.op) {
      case 'match':
        return { kind: 'correct', expected: o.a.ch, actual: o.b.ch, punct: o.a.punct };
      case 'del':
        return { kind: o.a.punct ? 'punctuation' : 'missing', expected: o.a.ch, punct: o.a.punct };
      case 'ins':
        return { kind: o.b.punct ? 'punctuation' : 'extra', actual: o.b.ch, punct: o.b.punct };
      case 'sub': {
        if (o.a.punct) return { kind: 'punctuation', expected: o.a.ch, actual: o.b.ch, punct: true };
        const want = expPy[expIndex.get(o.a)!] ?? '';
        const got = o.b.han ? readings(o.b.ch) : [];
        const expAll = readings(o.a.ch);
        // Same sound: the contextual reading matches, or both characters share a reading of the same
        // syllable (covers neutral tones the library can misread, e.g. 跑得 → "dé" vs 的 "de").
        const sameSound = got.includes(want) || got.some((r) => expAll.includes(r) && toneless(r) === toneless(want));
        const kind = sameSound ? 'wrong_character' : got.some((r) => toneless(r) === toneless(want)) ? 'tone' : 'misheard';
        return { kind, expected: o.a.ch, actual: o.b.ch, punct: false };
      }
    }
  });
  return summarize(tokens, opts.ignorePunctuation);
}

/** Pinyin (with tones) of each expected unit, for hints. Order matches non-punctuation tokens. */
export function expectedPinyinUnits(expected: string): { ch: string; py: string }[] {
  const toks = tokenizeChinese(expected);
  const py = contextualPinyin(toks);
  return toks.flatMap((t, i) => (t.punct ? [] : [{ ch: t.ch, py: py[i] ?? '' }]));
}
