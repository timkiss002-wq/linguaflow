import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { useProgressMap, type LessonSummary } from '@/features/library/api';
import { recommendLessons, type Goal, type Recommendation } from '@/lib/personal/goals';
import { getSupabase } from '@/lib/supabase';
import { useLearner, type StoredGoal } from './api';

export const toGoal = (g: StoredGoal): Goal => ({
  language: g.language,
  exam: g.exam as Goal['exam'],
  current_level: g.current_level,
  target_level: g.target_level,
  exam_date: g.exam_date,
  focus_skills: g.focus_skills,
});

/** Recommended lessons per goal (empty until the learner has set goals). */
export function useRecommendations(limit = 3): { language: 'en' | 'zh'; items: Recommendation<LessonSummary>[] }[] | undefined {
  const user = useUser();
  const learner = useLearner();
  const progress = useProgressMap();
  const lessons = useQuery({
    queryKey: ['all-lessons', user.id],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('lesson_catalog').select('*').eq('is_published', true);
      if (error) throw error;
      return data;
    },
  });
  if (!learner.data || !lessons.data || !progress.data) return undefined;
  const completed = new Set([...progress.data.values()].filter((p) => p.status === 'completed').map((p) => p.lesson_id!));
  const interests = learner.data.profile?.interests ?? [];
  return learner.data.goals.map((g) => ({ language: g.language, items: recommendLessons(lessons.data, toGoal(g), interests, completed, limit) }));
}
