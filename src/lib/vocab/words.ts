export interface Segment {
  text: string;
  /** True for words that can be looked up (not spaces or punctuation). */
  isWord: boolean;
}

const EN_WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** Splits a sentence into lookup-able words and the text between them. */
export function splitWords(text: string, language: 'en' | 'zh'): Segment[] {
  if (language === 'zh') {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const seg = new Intl.Segmenter('zh', { granularity: 'word' });
      return [...seg.segment(text)].map((s) => ({ text: s.segment, isWord: Boolean(s.isWordLike) }));
    }
    return [...text].map((c) => ({ text: c, isWord: /\p{Script=Han}/u.test(c) }));
  }
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(EN_WORD)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), isWord: false });
    out.push({ text: m[0], isWord: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), isWord: false });
  return out;
}

/** Form saved to the notebook: English lower-cased (except "I" and proper-looking all-caps), Chinese as is. */
export function normalizeTerm(word: string, language: 'en' | 'zh'): string {
  const w = word.trim().replace(/[’]/g, "'");
  if (language === 'zh') return w;
  return w === 'I' || /^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase();
}
