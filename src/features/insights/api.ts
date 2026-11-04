import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import type { InsightData } from '@/lib/personal/insights';
import { getSupabase } from '@/lib/supabase';

export function useInsightData(days: number) {
  const user = useUser();
  return useQuery({
    queryKey: ['insights', user.id, days],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_insight_data', { p_days: days });
      if (error) throw error;
      return data as unknown as InsightData;
    },
  });
}
