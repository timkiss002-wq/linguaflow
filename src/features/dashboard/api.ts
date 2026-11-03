import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';

export interface DashboardSummary {
  streak: number;
  wordsSaved: number;
  dueToday: number;
  videosCompleted: number;
}

async function count(promise: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await promise;
  if (error) throw error;
  return count ?? 0;
}

async function fetchSummary(): Promise<DashboardSummary> {
  const sb = getSupabase();
  // RLS limits every query to the signed-in user's rows.
  const [streakRes, wordsSaved, dueToday, videosCompleted] = await Promise.all([
    sb.rpc('get_learning_streak'),
    count(sb.from('vocabulary').select('id', { count: 'exact', head: true })),
    count(sb.from('vocabulary').select('id', { count: 'exact', head: true }).lte('due_at', new Date().toISOString())),
    count(sb.from('learning_progress').select('video_id', { count: 'exact', head: true }).eq('status', 'completed')),
  ]);
  if (streakRes.error) throw streakRes.error;
  return { streak: streakRes.data ?? 0, wordsSaved, dueToday, videosCompleted };
}

export function useDashboardSummary() {
  const user = useUser();
  return useQuery({ queryKey: ['dashboard', 'summary', user.id], queryFn: fetchSummary });
}
