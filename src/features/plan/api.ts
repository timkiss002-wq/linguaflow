import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import type { Plan, PlanItem, TodayProgress } from '@/lib/personal/plan';
import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

export interface StoredPlan extends Plan {
  day: string;
  status: Record<string, 'done' | 'skipped'>;
}

const keys = {
  progress: (uid: string) => ['plan', 'progress', uid] as const,
  plans: (uid: string) => ['plan', 'stored', uid] as const,
};

/** Today's date in the learner's time zone and what they did today. */
export function usePlanProgress() {
  const user = useUser();
  return useQuery({
    queryKey: keys.progress(user.id),
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_plan_progress');
      if (error) throw error;
      return data as unknown as TodayProgress & { today: string };
    },
  });
}

/** Plans of the last 15 days (today's, if built, comes first). */
export function useStoredPlans(today: string | undefined) {
  const user = useUser();
  return useQuery({
    queryKey: [...keys.plans(user.id), today],
    enabled: Boolean(today),
    queryFn: async (): Promise<StoredPlan[]> => {
      const since = new Date(Date.parse(`${today}T00:00:00Z`) - 14 * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await getSupabase().from('daily_plans').select('*').gte('day', since).order('day', { ascending: false });
      if (error) throw error;
      return data.map((r) => ({
        day: r.day,
        restDay: r.rest_day,
        items: r.items as unknown as PlanItem[],
        notes: r.notes as unknown as string[],
        status: r.status as unknown as StoredPlan['status'],
      }));
    },
  });
}

export function useSavePlan() {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    scope: { id: 'daily-plan' },
    mutationFn: async (v: { day: string; plan: Plan }) => {
      // ignoreDuplicates: if another tab saved today's plan first, keep that one
      const { error } = await getSupabase()
        .from('daily_plans')
        .upsert(
          { day: v.day, items: v.plan.items as unknown as NonNullable<Json>, notes: v.plan.notes as unknown as NonNullable<Json>, rest_day: v.plan.restDay },
          { onConflict: 'user_id,day', ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.plans(user.id) }),
  });
}

export function useSetItemStatus() {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    scope: { id: 'daily-plan' },
    mutationFn: async (v: { day: string; key: string; status: 'done' | 'skipped' | null }) => {
      const { error } = await getSupabase().rpc('set_plan_item_status', { p_day: v.day, p_key: v.key, p_status: v.status as string });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.plans(user.id) }),
  });
}

/** Throw today's plan away; a new one is built from freshly loaded data. */
export function useRebuildPlan() {
  const qc = useQueryClient();
  return useMutation({
    scope: { id: 'daily-plan' },
    mutationFn: async (day: string) => {
      const { error } = await getSupabase().from('daily_plans').delete().eq('day', day);
      if (error) throw error;
    },
    // everything the plan reads (profile, goals, words, tests…) may have changed
    onSettled: () => qc.invalidateQueries(),
  });
}
