/**
 * Where a quote sits in a reading passage — "Đoạn B, câu 3" — and the whole sentence around it,
 * so an explanation can point at the exact place instead of only saying "in the passage". Pure.
 */

/** Split prose into sentences, keeping the text verbatim (offsets stay valid). Abbreviations like "e.g." or "Dr." are tolerated. */
export function splitSentences(text: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  const re = /[^.!?]*(?:[.!?]+["”’)]*|$)/g;
  let m: RegExpExecArray | null;
  let pendingStart = -1;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      if (re.lastIndex >= text.length) break;
      re.lastIndex += 1;
      continue;
    }
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const start = pendingStart >= 0 ? pendingStart : m.index + lead;
    const end = m.index + raw.length;
    const piece = text.slice(start, end).trim();
    // glue short "sentences" produced by abbreviations (e.g. / Dr. / 2.5) onto the next one
    const title = /\b(?:Dr|Mr|Mrs|Ms|Prof|St|Mt)\.$/.test(piece);
    const abbrev = /(?:\b[A-Za-z]|\b(?:e\.g|i\.e|etc|vs|No|approx)|\d)\.$/.test(piece) && !/^\s+[A-Z“"]/.test(text.slice(end, end + 3));
    if ((title || abbrev) && end < text.length) {
      pendingStart = start;
      continue;
    }
    pendingStart = -1;
    if (piece) out.push({ start, end, text: piece });
  }
  return out;
}

export interface Location {
  /** 0-based paragraph index */
  para: number;
  /** the paragraph's own label (A, B, …) when the passage has them */
  label: string | null;
  /** 1-based sentence numbers inside that paragraph that the quote touches */
  sentences: number[];
  /** the full sentence(s) containing the quote */
  sentence: string;
}

/** Find a quote in `paragraphs` ([label | null, text][]); null when it is not an exact substring. */
export function locateQuote(paragraphs: (string | null)[][], quote: string): Location | null {
  const q = quote.trim();
  if (!q) return null;
  for (let i = 0; i < paragraphs.length; i++) {
    const [label, text] = paragraphs[i]!;
    if (!text) continue;
    const at = text.indexOf(q);
    if (at < 0) continue;
    const end = at + q.length;
    const all = splitSentences(text);
    const hit = all.map((s, k) => ({ s, k })).filter(({ s }) => s.end > at && s.start < end);
    const sentences = hit.map(({ k }) => k + 1);
    const sentence = hit.length ? text.slice(hit[0]!.s.start, hit[hit.length - 1]!.s.end).trim() : q;
    return { para: i, label: label ?? null, sentences, sentence };
  }
  return null;
}

/** "Đoạn B, câu 2–3" (or "Đoạn 2, câu 1" when the passage has no letters). */
export function locationLabel(loc: Location): string {
  const para = loc.label ? `Đoạn ${loc.label}` : `Đoạn ${loc.para + 1}`;
  if (!loc.sentences.length) return para;
  const [a, b] = [loc.sentences[0]!, loc.sentences[loc.sentences.length - 1]!];
  return a === b ? `${para}, câu ${a}` : `${para}, câu ${a}–${b}`;
}

/** The sentence of a plain text (one or more paragraphs) that contains `phrase`, or null. */
export function sentenceWith(text: string, phrase: string): string | null {
  const paras = text.split(/\n+/).map((t) => [null, t] as (string | null)[]);
  return locateQuote(paras, phrase)?.sentence ?? null;
}
