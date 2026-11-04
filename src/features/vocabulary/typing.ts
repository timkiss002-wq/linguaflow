import { compareChinese } from '@/lib/compare/chinese';
import { compareEnglish } from '@/lib/compare/english';
import type { CompareResult } from '@/lib/compare';
import { findCloze, type Cloze } from '@/lib/vocab/cloze';
import type { VocabWord } from './api';

export type TypingMode = 'copy' | 'listen' | 'meaning' | 'cloze';

export const MODE_INFO: Record<TypingMode, { title: string; help: string }> = {
  copy: { title: 'Copy', help: 'Look at the word and type it exactly.' },
  listen: { title: 'Listen', help: 'Type the word you hear.' },
  meaning: { title: 'Recall', help: 'Type the word that means this.' },
  cloze: { title: 'In context', help: 'Type the missing word in the sentence.' },
};

/**
 * Practice queue. Explicit ids keep their order. Otherwise: words still being learnt
 * (typing level < 4) — last answered wrong first, then never practised (newest first),
 * then the least recently practised.
 */
export function buildQueue(words: VocabWord[], opts: { ids?: string[]; lang?: 'en' | 'zh'; limit?: number } = {}): VocabWord[] {
  const limit = opts.limit ?? 15;
  if (opts.ids?.length) {
    const byId = new Map(words.map((w) => [w.id, w]));
    return opts.ids.map((id) => byId.get(id)).filter((w): w is VocabWord => Boolean(w)).slice(0, 50);
  }
  const pool = words.filter((w) => w.typing_level < 4 && (!opts.lang || w.language === opts.lang));
  const rank = (w: VocabWord) => (w.last_typed_at && w.typing_streak === 0 ? 0 : !w.last_typed_at ? 1 : 2);
  return [...pool]
    .sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r) return r;
      if (rank(a) === 1) return b.created_at.localeCompare(a.created_at);
      return (a.last_typed_at ?? '').localeCompare(b.last_typed_at ?? '');
    })
    .slice(0, limit);
}

export interface Exercise {
  mode: TypingMode;
  cloze: Cloze | null;
}

/** Harder exercise as the level rises; falls back when a word lacks a meaning or a usable sentence. */
export function exerciseFor(w: VocabWord): Exercise {
  const lang = w.language as 'en' | 'zh';
  const cloze = findCloze([w.context_sentence, ...(w.examples ?? [])], w.term, lang);
  const wanted: TypingMode[] = ['copy', 'listen', 'meaning', 'cloze', 'cloze'];
  let mode = wanted[Math.min(w.typing_level, 4)]!;
  if (mode === 'cloze' && !cloze) mode = 'meaning';
  if (mode === 'meaning' && !w.meaning_vi) mode = 'listen';
  return { mode, cloze: mode === 'cloze' ? cloze : null };
}

/** Same checker as dictation, so mistakes are explained the same way. */
export function checkTyping(w: VocabWord, typed: string): CompareResult {
  return w.language === 'zh'
    ? compareChinese(w.term, typed, { ignorePunctuation: true })
    : compareEnglish(w.term, typed, { ignorePunctuation: true });
}

/** "demolish" → "d_______"; Chinese → its reading. */
export function firstLetterHint(w: VocabWord): string {
  if (w.language === 'zh') return w.reading ?? '';
  return w.term
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : part[0] + '_'.repeat(Math.max(0, part.length - 1))))
    .join('');
}
