import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { profileKeys } from '@/features/profile/api';
import type { CoverageRow, Goal } from '@/lib/personal/goals';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type LearnerProfile = Tables<'learner_profiles'>;
export type StoredGoal = Tables<'learning_goals'>;

export interface LearnerData {
  profile: LearnerProfile | null;
  goals: StoredGoal[];
}

export const learnerKeys = { me: (userId: string) => ['learner', userId] as const };

export function useLearner() {
  const user = useUser();
  return useQuery({
    queryKey: learnerKeys.me(user.id),
    queryFn: async (): Promise<LearnerData> => {
      const sb = getSupabase();
      const [p, g] = await Promise.all([
        sb.from('learner_profiles').select('*').maybeSingle(),
        sb.from('learning_goals').select('*').order('language'),
      ]);
      if (p.error) throw p.error;
      if (g.error) throw g.error;
      return { profile: p.data, goals: g.data };
    },
  });
}

export interface LearnerInput {
  goals: Goal[];
  interests: string[];
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  studyDays: number[];
  habitAnalysis: boolean;
  dailyGoalMinutes: number;
}

/** Saves the whole learning profile: habits, interests, daily goal and one goal per chosen language. */
export function useSaveLearner() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LearnerInput) => {
      const sb = getSupabase();
      const { error: pErr } = await sb.from('learner_profiles').upsert({
        user_id: user.id,
        interests: input.interests,
        preferred_time: input.preferredTime,
        study_days: input.studyDays,
        habit_analysis: input.habitAnalysis,
        onboarded_at: new Date().toISOString(),
      });
      if (pErr) throw pErr;

      const { error: dErr } = await sb.from('profiles').update({ daily_goal_minutes: input.dailyGoalMinutes }).eq('id', user.id);
      if (dErr) throw dErr;

      if (input.goals.length) {
        const { error } = await sb.from('learning_goals').upsert(
          input.goals.map((g) => ({ user_id: user.id, ...g, exam_date: g.exam_date || null })),
          { onConflict: 'user_id,language' },
        );
        if (error) throw error;
      }
      const keep = input.goals.map((g) => g.language);
      const drop = (['en', 'zh'] as const).filter((l) => !keep.includes(l));
      if (drop.length) {
        const { error } = await sb.from('learning_goals').delete().eq('user_id', user.id).in('language', drop);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: learnerKeys.me(user.id) });
      qc.invalidateQueries({ queryKey: profileKeys.me(user.id) });
    },
  });
}

export function useHskCoverage(version: 2 | 3, enabled = true) {
  const user = useUser();
  return useQuery({
    queryKey: ['hsk-coverage', user.id, version],
    enabled,
    queryFn: async (): Promise<CoverageRow[]> => {
      const { data, error } = await getSupabase().rpc('get_hsk_coverage', { p_version: version });
      if (error) throw error;
      return data;
    },
  });
}

/** HSK level + English gloss for a Chinese word (shown in the word popup). */
export function useHskWord(word: string | null) {
  return useQuery({
    queryKey: ['hsk-word', word],
    enabled: Boolean(word),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('hsk_words').select('pinyin, level_v2, level_v3, meaning_en').eq('word', word!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
