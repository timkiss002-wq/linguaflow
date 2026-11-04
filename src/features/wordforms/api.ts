import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import { buildIndex, type Family, type FamilyIndex, type FormPos } from '@/lib/wordforms';

/** All word families (shared reference data, ~100 families) — loaded once per session. */
export function useWordFamilies() {
  return useQuery({
    queryKey: ['word-families'],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<Family[]> => {
      const sb = getSupabase();
      const [fam, mem, ex] = await Promise.all([
        sb.from('word_families').select('id, note, traps').order('id'),
        sb.from('word_family_members').select('family_id, word, pos, meaning_vi').order('id'),
        sb.from('word_family_examples').select('id, family_id, sentence, answer, answer_pos, base_word, why').order('id'),
      ]);
      const error = fam.error ?? mem.error ?? ex.error;
      if (error) throw error;
      const byId = new Map<string, Family>((fam.data ?? []).map((f) => [f.id, { id: f.id, note: f.note, traps: f.traps, members: [], examples: [] }]));
      for (const m of mem.data ?? []) byId.get(m.family_id)?.members.push({ word: m.word, pos: m.pos as FormPos, meaning_vi: m.meaning_vi });
      for (const e of ex.data ?? []) byId.get(e.family_id)?.examples.push({ ...e, answer_pos: e.answer_pos as FormPos });
      return [...byId.values()];
    },
  });
}

/** Index for lookups; undefined until loaded (callers then skip word-form features). */
export function useWordFamilyIndex(): FamilyIndex | undefined {
  const { data } = useWordFamilies();
  return useMemo(() => (data ? buildIndex(data) : undefined), [data]);
}

export interface WordFormAttempt {
  family_id: string;
  exercise: 'gap' | 'grid' | 'fix' | 'sort';
  expected: string;
  expected_pos: FormPos;
  typed: string;
  typed_pos: FormPos | null;
  result: 'correct' | 'word_form' | 'spelling' | 'other';
}

export function useRecordWordForm() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    scope: { id: 'word-form' },
    mutationFn: async (a: WordFormAttempt) => {
      const { error } = await getSupabase().from('word_form_attempts').insert({ ...a, typed: a.typed.slice(0, 100) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['word-form-stats', user.id] }),
  });
}

export interface WordFormStats {
  total: number;
  correct: number;
  /** "needed X, wrote Y" counts, most frequent first. */
  confusions: { expected: FormPos; typed: FormPos; count: number }[];
  /** Accuracy per required part of speech. */
  byPos: Record<FormPos, { total: number; correct: number }>;
  /** Families answered wrong most often. */
  hardest: { family: string; wrong: number }[];
}

/** Summary of the last 500 answers — the "weak spots" panel. */
export function useWordFormStats() {
  const user = useUser();
  return useQuery({
    queryKey: ['word-form-stats', user.id],
    queryFn: async (): Promise<WordFormStats> => {
      const { data, error } = await getSupabase()
        .from('word_form_attempts')
        .select('family_id, expected_pos, typed_pos, result')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const byPos = { noun: { total: 0, correct: 0 }, verb: { total: 0, correct: 0 }, adj: { total: 0, correct: 0 }, adv: { total: 0, correct: 0 } };
      const conf = new Map<string, number>();
      const wrong = new Map<string, number>();
      for (const a of data) {
        const p = byPos[a.expected_pos as FormPos];
        p.total += 1;
        if (a.result === 'correct') p.correct += 1;
        else wrong.set(a.family_id, (wrong.get(a.family_id) ?? 0) + 1);
        if (a.result === 'word_form' && a.typed_pos) conf.set(`${a.expected_pos}>${a.typed_pos}`, (conf.get(`${a.expected_pos}>${a.typed_pos}`) ?? 0) + 1);
      }
      return {
        total: data.length,
        correct: data.filter((a) => a.result === 'correct').length,
        byPos,
        confusions: [...conf.entries()]
          .map(([k, count]) => {
            const [expected, typed] = k.split('>') as [FormPos, FormPos];
            return { expected, typed, count };
          })
          .sort((a, b) => b.count - a.count),
        hardest: [...wrong.entries()].map(([family, n]) => ({ family, wrong: n })).sort((a, b) => b.wrong - a.wrong).slice(0, 5),
      };
    },
  });
}
