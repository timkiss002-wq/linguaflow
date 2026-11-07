/** Learner highlights in a reading passage: character ranges inside one paragraph's text. */
export interface Highlight {
  /** paragraph index within the part */
  p: number;
  start: number;
  end: number;
}

/** A note sits on a highlight; key = `${paragraph}:${start}` of that highlight. */
export const noteKey = (h: Highlight) => `${h.p}:${h.start}`;

/** Add a range, merging with any it touches or overlaps in the same paragraph. */
export function addHighlight(list: Highlight[], h: Highlight): Highlight[] {
  if (h.end <= h.start) return list;
  let { start, end } = h;
  const rest: Highlight[] = [];
  for (const x of list) {
    if (x.p === h.p && x.start <= end && x.end >= start) {
      start = Math.min(start, x.start);
      end = Math.max(end, x.end);
    } else rest.push(x);
  }
  return sortHighlights([...rest, { p: h.p, start, end }]);
}

/** Remove a range: highlights inside it disappear, ones crossing its edges are trimmed. */
export function removeHighlight(list: Highlight[], h: Highlight): Highlight[] {
  const out: Highlight[] = [];
  for (const x of list) {
    if (x.p !== h.p || x.end <= h.start || x.start >= h.end) {
      out.push(x);
      continue;
    }
    if (x.start < h.start) out.push({ p: x.p, start: x.start, end: h.start });
    if (x.end > h.end) out.push({ p: x.p, start: h.end, end: x.end });
  }
  return sortHighlights(out);
}

const sortHighlights = (l: Highlight[]) => [...l].sort((a, b) => a.p - b.p || a.start - b.start);

export interface Segment {
  text: string;
  start: number;
  /** covered by a learner highlight */
  user: boolean;
  /** covered by the answer evidence of this question (after marking) */
  evidence: number | null;
  /** first segment of that evidence (carries its number and anchor id) */
  evidenceStart: boolean;
}

/** Split a paragraph into runs that share the same highlighting. */
export function segment(text: string, user: { start: number; end: number }[], evidence: { n: number; start: number; end: number }[]): Segment[] {
  const cuts = new Set([0, text.length]);
  for (const r of [...user, ...evidence]) {
    cuts.add(Math.max(0, Math.min(text.length, r.start)));
    cuts.add(Math.max(0, Math.min(text.length, r.end)));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (b <= a) continue;
    const ev = evidence.find((r) => r.start <= a && r.end >= b);
    out.push({ text: text.slice(a, b), start: a, user: user.some((r) => r.start <= a && r.end >= b), evidence: ev?.n ?? null, evidenceStart: Boolean(ev && ev.start === a) });
  }
  return out;
}

/** Evidence quotes located in a paragraph (overlapping quotes: the first one wins). */
export function evidenceRanges(text: string, marks: { n: number; quote: string }[]) {
  const found = marks
    .map((m) => ({ n: m.n, start: m.quote ? text.indexOf(m.quote) : -1, end: 0 }))
    .filter((r) => r.start >= 0)
    .map((r) => ({ ...r, end: r.start + marks.find((m) => m.n === r.n)!.quote.length }))
    .sort((a, b) => a.start - b.start);
  const out: typeof found = [];
  for (const r of found) if (!out.length || r.start >= out[out.length - 1]!.end) out.push(r);
  return out;
}
