import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import { lookupEnglish } from '@/lib/vocab/dictionary';
import type { VocabRow } from '@/lib/vocab/csv';
import type { Pos } from '@/lib/vocab/pos';
import type { Tables, TablesUpdate } from '@/types/database';

export type VocabWord = Tables<'vocabulary'> & { lesson?: { title: string } | null };
export type Language = 'en' | 'zh';

export const vocabKeys = {
  all: (userId: string) => ['vocabulary', userId] as const,
  lookup: (language: Language, term: string) => ['lookup', language, term] as const,
};

/** The whole notebook, newest first. Filtering happens in the browser so the sheet feels instant. */
export function useVocabulary() {
  const user = useUser();
  return useQuery({
    queryKey: vocabKeys.all(user.id),
    queryFn: async (): Promise<VocabWord[]> => {
      const { data, error } = await getSupabase()
        .from('vocabulary')
        .select('*, lesson:lessons(title)')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as VocabWord[];
    },
  });
}

export class DuplicateWordError extends Error {
  constructor(term: string) {
    super(`"${term}" is already in your notebook.`);
  }
}

export interface NewWord {
  language: Language;
  term: string;
  reading?: string | null;
  meaning_vi?: string | null;
  part_of_speech?: Pos | null;
  topic?: string | null;
  context_sentence?: string | null;
  examples?: string[];
  source_lesson_id?: string | null;
  source_sentence_id?: string | null;
}

export function useAddWord() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: NewWord) => {
      const { data, error } = await getSupabase().from('vocabulary').insert(w).select('*, lesson:lessons(title)').single();
      if (error?.code === '23505') throw new DuplicateWordError(w.term);
      if (error) throw error;
      return data as VocabWord;
    },
    onSuccess: (word) => {
      qc.setQueryData<VocabWord[]>(vocabKeys.all(user.id), (old) => (old ? [word, ...old] : old));
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['words-saved'] });
    },
  });
}

type WordPatch = Pick<TablesUpdate<'vocabulary'>, 'term' | 'reading' | 'meaning_vi' | 'part_of_speech' | 'topic' | 'context_sentence' | 'examples' | 'notes'>;

/** Optimistic: the cell shows the new value immediately and rolls back on error. */
export function useUpdateWord() {
  const user = useUser();
  const qc = useQueryClient();
  const key = vocabKeys.all(user.id);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: WordPatch }) => {
      const { data, error } = await getSupabase().from('vocabulary').update(patch).eq('id', id).select('*, lesson:lessons(title)').single();
      if (error?.code === '23505') throw new DuplicateWordError(patch.term ?? '');
      if (error) throw error;
      return data as VocabWord;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<VocabWord[]>(key);
      qc.setQueryData<VocabWord[]>(key, (old) => old?.map((w) => (w.id === id ? { ...w, ...patch } as VocabWord : w)));
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(key, ctx.previous),
    onSuccess: (word) => qc.setQueryData<VocabWord[]>(key, (old) => old?.map((w) => (w.id === word.id ? word : w))),
  });
}

export function useDeleteWords() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await getSupabase().from('vocabulary').delete().in('id', ids);
      if (error) throw error;
      return ids;
    },
    onSuccess: (ids) => {
      qc.setQueryData<VocabWord[]>(vocabKeys.all(user.id), (old) => old?.filter((w) => !ids.includes(w.id)));
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Bulk import (CSV). Words already in the notebook are skipped, not overwritten. */
export function useImportWords() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, language }: { rows: VocabRow[]; language: Language }) => {
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200).map((r) => ({
          user_id: user.id,
          language,
          term: r.term,
          meaning_vi: r.meaning_vi,
          topic: r.topic,
          part_of_speech: r.part_of_speech,
          reading: r.reading,
          context_sentence: r.context_sentence,
          examples: r.examples,
        }));
        const { data, error } = await getSupabase()
          .from('vocabulary')
          .upsert(chunk, { onConflict: 'user_id,language,term_normalized', ignoreDuplicates: true })
          .select('id');
        if (error) throw error;
        inserted += data.length;
      }
      return { inserted, duplicates: rows.length - inserted };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vocabKeys.all(user.id) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** English: free dictionary (IPA, types, definitions). Cached for the session. */
export function useEnglishLookup(term: string | null) {
  return useQuery({
    queryKey: vocabKeys.lookup('en', term ?? ''),
    enabled: Boolean(term),
    staleTime: Infinity,
    retry: 1,
    queryFn: () => lookupEnglish(term!),
  });
}

/** Shared Vietnamese dictionary maintained by admins (may be empty for many words). */
export function useSharedMeaning(language: Language, term: string | null) {
  return useQuery({
    queryKey: ['shared-dictionary', language, term],
    enabled: Boolean(term),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('dictionary_entries')
        .select('meaning_vi, part_of_speech, reading, example')
        .eq('language', language)
        .eq('term_normalized', term!.trim().toLowerCase())
        .limit(3);
      if (error) throw error;
      return data;
    },
  });
}

export function useRecordTyping() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    scope: { id: 'typing' },
    mutationFn: async (a: { id: string; mode: 'copy' | 'listen' | 'meaning' | 'cloze'; typed: string; correct: boolean }) => {
      const { data, error } = await getSupabase().rpc('record_typing_practice', {
        p_vocabulary_id: a.id,
        p_mode: a.mode,
        p_typed: a.typed,
        p_correct: a.correct,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (word) =>
      qc.setQueryData<VocabWord[]>(vocabKeys.all(user.id), (old) => old?.map((w) => (w.id === word.id ? { ...w, ...word } : w))),
  });
}

/** Topics from the learner's sheet plus anything they've used. */
export const DEFAULT_TOPICS = [
  'Daily life',
  'Work and study',
  'Environment',
  'Economics',
  'Psychology',
  'Agriculture / Animals',
  'Medicine/healthcare',
  'Technology',
  'Law',
  'History',
  'Travel',
];

export function topicOptions(words: VocabWord[] | undefined): string[] {
  const used = new Set(words?.map((w) => w.topic).filter((t): t is string => Boolean(t)));
  const merged = [...DEFAULT_TOPICS];
  for (const t of used) if (!merged.some((m) => m.toLowerCase() === t.toLowerCase())) merged.push(t);
  return merged;
}
