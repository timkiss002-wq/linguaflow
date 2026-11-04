import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';

export type StatsLanguage = 'en' | 'zh' | undefined;

export interface LearningStats {
  total_seconds: number;
  period_seconds: number;
  attempts: number;
  avg_accuracy: number | null;
  sentences_finished: number;
  lessons_completed: number;
  words: number;
  words_by_status: Record<'new' | 'learning' | 'reviewing' | 'mastered', number>;
  errors: Record<string, number>;
  confusions: { expected: string; typed: string; count: number }[];
  weekly_accuracy: { week: string; accuracy: number | null; attempts: number }[];
  reviews: Partial<Record<'again' | 'hard' | 'good' | 'easy', number>>;
}

export function useLearningStats(language: StatsLanguage, days = 30) {
  const user = useUser();
  return useQuery({
    queryKey: ['stats', user.id, language ?? 'all', days],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_learning_stats', { p_language: language, p_days: days });
      if (error) throw error;
      return data as unknown as LearningStats;
    },
  });
}

export interface DayActivity {
  day: string;
  minutes: number;
  attempts: number;
  reviews: number;
}

export function useDailyActivity(language: StatsLanguage, days: number) {
  const user = useUser();
  return useQuery({
    queryKey: ['daily-activity', user.id, language ?? 'all', days],
    queryFn: async (): Promise<DayActivity[]> => {
      const { data, error } = await getSupabase().rpc('get_daily_activity', { p_days: days, p_language: language });
      if (error) throw error;
      return data.map((d) => ({ day: d.day, minutes: Math.round((d.active_seconds / 60) * 10) / 10, attempts: d.attempts, reviews: d.reviews }));
    },
  });
}

/** "1h 25m" / "12m" / "45s" */
export function formatStudyTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
