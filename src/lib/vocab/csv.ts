import { normalizePos, POS_LABEL, type Pos } from './pos';

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, commas/newlines inside quotes, BOM). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const cell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export interface VocabRow {
  term: string;
  meaning_vi: string | null;
  topic: string | null;
  part_of_speech: Pos | null;
  examples: string[];
  context_sentence: string | null;
  reading: string | null;
  created_at?: string | null;
}

/** Same column order as the learner's Google Sheet, plus a few LinguaFlow extras at the end. */
export const SHEET_HEADERS = ['STT', 'Ngày thêm', 'Từ mới', 'Giải thích', 'Topic', 'loại từ', 'Ví dụ 1', 'Ví dụ 2', 'Ví dụ 3', 'Ví dụ 4', 'Ví dụ 5', 'Phiên âm', 'Ngữ cảnh'];

const dateVi = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export function vocabularyToCsv(rows: VocabRow[]): string {
  return toCsv([
    SHEET_HEADERS,
    ...rows.map((r, i) => [
      i + 1,
      dateVi(r.created_at),
      r.term,
      r.meaning_vi,
      r.topic,
      r.part_of_speech ? POS_LABEL[r.part_of_speech] : '',
      ...Array.from({ length: 5 }, (_, k) => r.examples[k] ?? ''),
      r.reading,
      r.context_sentence,
    ]),
  ]);
}

const HEADER_KEYS: Record<string, keyof VocabRow | 'example'> = {
  'từ mới': 'term', từ: 'term', word: 'term', term: 'term', 'từ vựng': 'term',
  'giải thích': 'meaning_vi', nghĩa: 'meaning_vi', meaning: 'meaning_vi', 'nghĩa tiếng việt': 'meaning_vi',
  topic: 'topic', 'chủ đề': 'topic',
  'loại từ': 'part_of_speech', type: 'part_of_speech', pos: 'part_of_speech', 'part of speech': 'part_of_speech',
  'phiên âm': 'reading', ipa: 'reading', pinyin: 'reading',
  'ngữ cảnh': 'context_sentence', context: 'context_sentence',
};

export interface ImportResult {
  rows: VocabRow[];
  /** 1-based line numbers that were skipped and why. */
  skipped: { line: number; reason: string }[];
  /** Header row index used (0-based), useful when sheets have a title row above the headers. */
  headerRow: number;
}

/**
 * Reads a CSV exported from a vocabulary sheet. Finds the header row automatically (sheets often
 * have a title row first), maps Vietnamese/English headers, and keeps up to 5 "Ví dụ" columns.
 */
export function importVocabularyCsv(text: string): ImportResult {
  const table = parseCsv(text);
  const headerRow = table.findIndex((r) => r.some((h) => HEADER_KEYS[h.trim().toLowerCase()] === 'term'));
  if (headerRow < 0) return { rows: [], skipped: [{ line: 1, reason: 'No "Từ mới" / "Word" column found' }], headerRow: -1 };

  const headers = table[headerRow]!.map((h) => h.trim().toLowerCase());
  const col = (key: keyof VocabRow) => headers.findIndex((h) => HEADER_KEYS[h] === key);
  const exampleCols = headers.map((h, i) => (/^(ví dụ|example)\s*\d*$/.test(h) ? i : -1)).filter((i) => i >= 0);
  const idx = { term: col('term'), meaning: col('meaning_vi'), topic: col('topic'), pos: col('part_of_speech'), reading: col('reading'), context: col('context_sentence') };

  const rows: VocabRow[] = [];
  const skipped: ImportResult['skipped'] = [];
  const seen = new Set<string>();
  table.slice(headerRow + 1).forEach((r, i) => {
    const line = headerRow + i + 2;
    const get = (c: number) => (c >= 0 ? (r[c] ?? '').trim() : '');
    const term = get(idx.term);
    if (!term) return skipped.push({ line, reason: 'empty word' });
    if (term.length > 100) return skipped.push({ line, reason: 'word longer than 100 characters' });
    const key = term.toLowerCase();
    if (seen.has(key)) return skipped.push({ line, reason: `duplicate "${term}"` });
    seen.add(key);
    rows.push({
      term,
      meaning_vi: get(idx.meaning).slice(0, 500) || null,
      topic: get(idx.topic).slice(0, 60) || null,
      part_of_speech: normalizePos(get(idx.pos)),
      reading: get(idx.reading) || null,
      context_sentence: get(idx.context).slice(0, 1000) || null,
      examples: exampleCols.map(get).filter(Boolean).slice(0, 5).map((e) => e.slice(0, 500)),
    });
  });
  return { rows, skipped, headerRow };
}
