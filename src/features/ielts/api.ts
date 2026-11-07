import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import type { QuestionResult, Skill } from '@/lib/ielts/tests';
import { getSupabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/database';

export type IeltsAttempt = Omit<Tables<'ielts_attempts'>, 'results' | 'answers' | 'skill'> & {
  skill: Skill;
  results: Pick<QuestionResult, 'n' | 'type' | 'part' | 'mark'>[];
  answers: Record<string, string>;
};

const key = (uid: string) => ['ielts', 'attempts', uid] as const;

/** The learner's attempts, newest first. Returns [] (not an error) when the table does not exist yet. */
export function useIeltsAttempts() {
  const user = useUser();
  return useQuery({
    queryKey: key(user.id),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('ielts_attempts').select('*').order('created_at', { ascending: false }).limit(200);
      // migration not applied yet on this database: the tests still work, history is just empty
      if (error?.code === '42P01' || error?.code === 'PGRST205') return [] as IeltsAttempt[];
      if (error) throw error;
      return data as unknown as IeltsAttempt[];
    },
  });
}

export function useSaveIeltsAttempt() {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: async (v: { testId: string; skill: Skill; parts: string[]; mode: 'exam' | 'practice'; results: QuestionResult[]; answers: Record<number, string>; band: number | null; seconds: number }) => {
      const correct = v.results.filter((r) => r.mark === 'correct').length;
      const { error } = await getSupabase()
        .from('ielts_attempts')
        .insert({
          test_id: v.testId,
          skill: v.skill,
          parts: v.parts,
          mode: v.mode,
          correct,
          total: v.results.length,
          band: v.band,
          answers: v.answers as unknown as NonNullable<Json>,
          results: v.results.map(({ n, type, part, mark }) => ({ n, type, part, mark })) as unknown as NonNullable<Json>,
          duration_seconds: v.seconds,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(user.id) });
    },
  });
}
