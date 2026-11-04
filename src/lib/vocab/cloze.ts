export interface Cloze {
  before: string;
  answer: string;
  after: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Hides `term` inside `sentence` for a fill-in-the-blank exercise.
 * English matches whole words, case-insensitively; Chinese matches the substring.
 * Returns null when the term doesn't appear (the caller then uses another exercise).
 */
export function makeCloze(sentence: string | null | undefined, term: string, language: 'en' | 'zh'): Cloze | null {
  if (!sentence || !term.trim()) return null;
  const t = term.trim();
  if (language === 'zh') {
    const i = sentence.indexOf(t);
    return i < 0 ? null : { before: sentence.slice(0, i), answer: t, after: sentence.slice(i + t.length) };
  }
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escape(t).replace(/\s+/g, '\\s+')})(?=$|[^\\p{L}\\p{N}])`, 'iu');
  const m = re.exec(sentence);
  if (!m) return null;
  const start = m.index + m[1]!.length;
  const found = m[2]!;
  return { before: sentence.slice(0, start), answer: found, after: sentence.slice(start + found.length) };
}

/** First sentence (context, then examples) in which the word can be blanked out. */
export function findCloze(sentences: (string | null | undefined)[], term: string, language: 'en' | 'zh'): Cloze | null {
  for (const s of sentences) {
    const c = makeCloze(s, term, language);
    if (c) return c;
  }
  return null;
}
