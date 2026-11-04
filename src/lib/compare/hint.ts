import { expectedPinyinUnits } from './chinese';
import type { CompareResult } from './types';

export interface Hint {
  /** 1-based position of the unit (word / character) in the answer. */
  position: number;
  /** What to show: a partial clue (level 1) or the full unit (level 2). */
  text: string;
  level: 1 | 2;
  /** Key identifying the target, so a second hint on the same spot reveals it fully. */
  target: string;
}

/**
 * Next hint for the first unit the learner hasn't got right yet.
 * Level 1: English → first letter + blanks ("w______"); Chinese → the pinyin.
 * Level 2: the word / character itself.
 */
export function nextHint(language: 'en' | 'zh', expectedText: string, result: CompareResult, previousTarget: string | null): Hint | null {
  const zhUnits = language === 'zh' ? expectedPinyinUnits(expectedText) : [];
  let position = 0;
  for (const t of result.tokens) {
    if (t.punct || t.expected === undefined) continue;
    position += 1;
    if (t.kind === 'correct') continue;
    const target = `${position}:${t.expected}`;
    const level: 1 | 2 = previousTarget === target ? 2 : 1;
    let text = t.expected;
    if (level === 1) {
      text = language === 'zh' ? (zhUnits[position - 1]?.py ?? '?') : t.expected[0] + '_'.repeat(Math.max(0, [...t.expected].length - 1));
    }
    return { position, text, level, target };
  }
  return null;
}
