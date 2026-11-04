import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import { useProfile } from '@/features/profile/api';
import { DEFAULT_SETTINGS } from '@/features/profile/schemas';
import { useNewReviewedToday } from '@/features/review/api';
import { buildReviewQueue } from '@/features/review/queue';
import { useVocabulary } from '@/features/vocabulary/api';

export interface DashboardSummary {
  streak: number;
  wordsSaved: number;
  lessonsCompleted: number;
}

async function count(promise: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await promise;
  if (error) throw error;
  return count ?? 0;
}

async function fetchSummary(): Promise<DashboardSummary> {
  const sb = getSupabase();
  // RLS limits every query to the signed-in user's rows.
  const [streakRes, wordsSaved, lessonsCompleted] = await Promise.all([
    sb.rpc('get_learning_streak'),
    count(sb.from('vocabulary').select('id', { count: 'exact', head: true })),
    count(sb.from('learning_progress').select('lesson_id', { count: 'exact', head: true }).eq('status', 'completed')),
  ]);
  if (streakRes.error) throw streakRes.error;
  return { streak: streakRes.data ?? 0, wordsSaved, lessonsCompleted };
}

export function useDashboardSummary() {
  const user = useUser();
  return useQuery({ queryKey: ['dashboard', 'summary', user.id], queryFn: fetchSummary });
}

/** Cards in today's review queue (due + new up to the daily limit) — same rule as the Review page. */
export function useDueToday(): number | undefined {
  const vocab = useVocabulary();
  const newToday = useNewReviewedToday();
  const settings = useProfile().data?.settings ?? DEFAULT_SETTINGS;
  if (!vocab.data || !newToday.data) return undefined;
  return (['en', 'zh'] as const).reduce(
    (n, language) =>
      n +
      buildReviewQueue(vocab.data, {
        language,
        newLimit: settings.newPerDay,
        newDoneToday: vocab.data.filter((w) => w.language === language && newToday.data.has(w.id)).length,
      }).queue.length,
    0,
  );
}
