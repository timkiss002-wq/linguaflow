import { partQuestions, type TestPart } from './tests';

/**
 * Keyword stress for the listening audio. In real IELTS recordings the information that answers a question is said
 * clearly — names are spelt slowly, numbers and key words carry the stress. Browser voices read everything at one
 * flat pace, so the player reads these phrases a little slower, after a short pause. Pure, no I/O.
 */

/** Answers of the part's gap questions that are actually said in the script (as written there). */
export function emphasisPhrases(part: TestPart): string[] {
  const script = (part.script ?? []).map((l) => l[1] ?? '').join('\n');
  const lower = script.toLowerCase();
  const out = new Set<string>();
  for (const { group, q } of partQuestions(part)) {
    if (group.type !== 'gap' || !Array.isArray(q.answer)) continue;
    for (const a of q.answer) {
      const w = a.trim();
      if (w.length < 2) continue;
      const i = findWord(lower, w.toLowerCase());
      if (i >= 0) out.add(script.slice(i, i + w.length));
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

function findWord(hay: string, needle: string, from = 0): number {
  let i = hay.indexOf(needle, from);
  while (i >= 0) {
    const before = hay[i - 1];
    const after = hay[i + needle.length];
    if ((!before || !/[a-z0-9]/.test(before)) && (!after || !/[a-z0-9]/.test(after))) return i;
    i = hay.indexOf(needle, i + 1);
  }
  return -1;
}

export interface Segment {
  text: string;
  em: boolean;
}

/** A letter-by-letter spelling such as "K, O, W, A, L, S, K, I". */
const SPELLING = /\b[A-Z](?:,\s[A-Z]\b){2,}/g;

/** Splits a sentence into plain and stressed pieces (the answer phrases and any spelling). */
export function splitEmphasis(text: string, phrases: string[]): Segment[] {
  const ranges: [number, number][] = [];
  const lower = text.toLowerCase();
  for (const p of phrases) {
    let i = findWord(lower, p.toLowerCase());
    while (i >= 0) {
      ranges.push([i, i + p.length]);
      i = findWord(lower, p.toLowerCase(), i + p.length);
    }
  }
  for (const m of text.matchAll(SPELLING)) ranges.push([m.index, m.index + m[0].length]);
  if (!ranges.length) return [{ text, em: false }];
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  const out: Segment[] = [];
  let at = 0;
  for (const [s, e] of merged) {
    if (s > at && text.slice(at, s).trim()) out.push({ text: text.slice(at, s), em: false });
    out.push({ text: text.slice(s, e), em: true });
    at = e;
  }
  if (at < text.length && text.slice(at).trim()) out.push({ text: text.slice(at), em: false });
  return out;
}
