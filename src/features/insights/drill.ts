import { classifyZhPair, type InsightData } from '@/lib/personal/insights';

export interface DrillItem {
  key: string;
  /** Sentence with the character replaced by a gap. */
  before: string;
  after: string;
  answer: string;
  options: [string, string];
}

/** Cloze questions for same-sound characters the learner mixed up, built from the sentence where it happened. */
export function buildDrill(pairs: InsightData['pairs'], seed = 0): DrillItem[] {
  const items: DrillItem[] = [];
  for (const p of pairs) {
    if (p.language !== 'zh' || classifyZhPair(p.expected, p.typed).kind !== 'same-sound') continue;
    const at = p.sentence.indexOf(p.expected);
    if (at < 0) continue;
    const flip = (p.expected.charCodeAt(0) + seed) % 2 === 0;
    items.push({
      key: `${p.expected}${p.typed}`,
      before: p.sentence.slice(0, at),
      after: p.sentence.slice(at + p.expected.length),
      answer: p.expected,
      options: flip ? [p.expected, p.typed] : [p.typed, p.expected],
    });
  }
  return items.slice(0, 10);
}
