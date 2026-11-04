import { pinyin } from 'pinyin-pro';

export interface RubyToken {
  text: string;
  /** Pinyin with tone marks for a Han character, null for punctuation/latin/space. */
  pinyin: string | null;
}

const HAN = /\p{Script=Han}/u;

/**
 * One token per character with context-aware pinyin (handles 多音字 like 还/行/重).
 * `override` (space-separated, one syllable per Han character) wins when its length matches.
 */
export function toRubyTokens(text: string, override?: string | null): RubyToken[] {
  const chars = [...text];
  const auto = pinyin(text, { type: 'array', toneType: 'symbol' });
  const manual = override?.trim().split(/\s+/) ?? [];
  const hanCount = chars.filter((c) => HAN.test(c)).length;
  const useManual = manual.length === hanCount && hanCount > 0;

  let hanIndex = 0;
  return chars.map((c, i) => {
    if (!HAN.test(c)) return { text: c, pinyin: null };
    const py = useManual ? manual[hanIndex] : auto[i];
    hanIndex += 1;
    return { text: c, pinyin: py ?? null };
  });
}

/** Plain pinyin string for a whole sentence (used for search/compare later). */
export function toPinyin(text: string, tone: 'symbol' | 'none' = 'symbol'): string {
  return pinyin(text, { toneType: tone, nonZh: 'consecutive' }).replace(/\s+/g, ' ').trim();
}

const OPENING = /^[“‘「『（(《〈【[]$/;

/**
 * Groups tokens so punctuation stays with its neighbour when lines wrap:
 * opening marks (“ （ 《) attach to the next character, everything else to the previous one.
 */
export function groupForWrapping(tokens: RubyToken[]): RubyToken[][] {
  const groups: RubyToken[][] = [];
  let pendingOpen: RubyToken[] = [];
  for (const t of tokens) {
    if (t.pinyin) {
      groups.push([...pendingOpen, t]);
      pendingOpen = [];
    } else if (OPENING.test(t.text)) {
      pendingOpen.push(t);
    } else if (groups.length) {
      groups[groups.length - 1]!.push(t);
    } else {
      groups.push([t]);
    }
  }
  if (pendingOpen.length) groups.push(pendingOpen);
  return groups;
}
