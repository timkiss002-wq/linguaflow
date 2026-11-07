import { useMemo } from 'react';
import { useImportWords, useVocabulary } from '@/features/vocabulary/api';
import { useWordFamilies } from '@/features/wordforms/api';
import type { VocabRow } from '@/lib/vocab/csv';
import type { Family } from '@/lib/wordforms';
import { useStudyLanguage } from '@/features/study/context';
import { useNewReviewedToday } from './api';
import { isNewCard } from './queue';

/** Every day the learner studies at least this many new words (first review of a new card). */
export const DAILY_NEW_GOAL = 10;

/** New cards offered per day: the learner's setting, but never below the daily goal. */
export const newLimitFor = (newPerDay: number) => Math.max(DAILY_NEW_GOAL, newPerDay);

export interface DailyGoal {
  learned: number;
  goal: number;
  done: boolean;
  /** new cards waiting in the notebook (both languages) */
  available: number;
}

/** Today's goal for the language being studied (10 new English words, or 10 new Chinese words). */
export function useDailyGoal(): DailyGoal | undefined {
  const newToday = useNewReviewedToday();
  const vocab = useVocabulary();
  const { lang } = useStudyLanguage();
  return useMemo(() => {
    if (!newToday.data || !vocab.data) return undefined;
    const mine = vocab.data.filter((w) => w.language === lang);
    const learned = mine.filter((w) => newToday.data.has(w.id)).length;
    return { learned, goal: DAILY_NEW_GOAL, done: learned >= DAILY_NEW_GOAL, available: mine.filter(isNewCard).length };
  }, [newToday.data, vocab.data, lang]);
}

/** IELTS headwords from the word-family list that are not in the notebook yet (with a meaning and an example). */
export function starterWords(families: Family[], have: Set<string>, n: number): VocabRow[] {
  const out: VocabRow[] = [];
  for (const f of families) {
    const head = f.members.find((m) => m.word.toLowerCase() === f.id.toLowerCase()) ?? f.members[0];
    if (!head || have.has(head.word.toLowerCase())) continue;
    const ex = f.examples.find((e) => e.answer.toLowerCase().startsWith(head.word.toLowerCase())) ?? null;
    out.push({
      term: head.word,
      meaning_vi: head.meaning_vi,
      part_of_speech: head.pos,
      topic: 'IELTS',
      context_sentence: ex ? ex.sentence.replace(/[[\]]/g, '') : null,
      examples: [],
      reading: null,
    });
    if (out.length >= n) break;
  }
  return out;
}

/** Adds the next n IELTS headwords to the notebook, as new cards. */
export function useAddStarterWords() {
  const families = useWordFamilies();
  const vocab = useVocabulary();
  const imp = useImportWords();
  return {
    ready: Boolean(families.data && vocab.data),
    pending: imp.isPending,
    add: (n: number) => {
      const have = new Set((vocab.data ?? []).filter((w) => w.language === 'en').map((w) => w.term.toLowerCase()));
      const rows = starterWords(families.data ?? [], have, n);
      return imp.mutateAsync({ rows, language: 'en' });
    },
  };
}
