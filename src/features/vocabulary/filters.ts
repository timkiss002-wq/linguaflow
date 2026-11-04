import type { VocabWord } from './api';

export const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'mastered', label: 'Mastered' },
] as const;
export type Status = (typeof STATUSES)[number]['value'];

export interface VocabFilters {
  q: string;
  lang?: 'en' | 'zh';
  status?: Status;
  topic?: string;
  pos?: string;
  /** The sheet's Check column: only TRUE or only FALSE rows. */
  check?: 'true' | 'false';
}

export function parseVocabFilters(p: URLSearchParams): VocabFilters {
  const lang = p.get('lang');
  const status = p.get('status');
  return {
    q: (p.get('q') ?? '').slice(0, 100),
    lang: lang === 'en' || lang === 'zh' ? lang : undefined,
    status: STATUSES.some((s) => s.value === status) ? (status as Status) : undefined,
    topic: p.get('topic')?.slice(0, 60) || undefined,
    pos: p.get('pos')?.slice(0, 20) || undefined,
    check: p.get('check') === 'true' || p.get('check') === 'false' ? (p.get('check') as 'true' | 'false') : undefined,
  };
}

export function vocabFiltersToParams(f: VocabFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (f.q) out.set('q', f.q);
  if (f.lang) out.set('lang', f.lang);
  if (f.status) out.set('status', f.status);
  if (f.topic) out.set('topic', f.topic);
  if (f.pos) out.set('pos', f.pos);
  if (f.check) out.set('check', f.check);
  return out;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

/** Search matches the word, its meaning (accent-insensitive Vietnamese), reading and examples. */
export function filterWords(words: VocabWord[], f: VocabFilters, ignore: (keyof VocabFilters)[] = []): VocabWord[] {
  const q = fold(f.q.trim());
  return words.filter((w) => {
    if (f.lang && !ignore.includes('lang') && w.language !== f.lang) return false;
    if (f.status && !ignore.includes('status') && w.status !== f.status) return false;
    if (f.topic && !ignore.includes('topic') && (w.topic ?? '').toLowerCase() !== f.topic.toLowerCase()) return false;
    if (f.pos && !ignore.includes('pos') && w.part_of_speech !== f.pos) return false;
    if (f.check && !ignore.includes('check') && w.review_correct !== (f.check === 'true')) return false;
    if (!q) return true;
    return [w.term, w.meaning_vi, w.reading, w.context_sentence, ...(w.examples ?? [])].some((v) => v && fold(v).includes(q));
  });
}

export function countByStatus(words: VocabWord[]): Record<Status, number> {
  const out: Record<Status, number> = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
  for (const w of words) out[w.status as Status] += 1;
  return out;
}
