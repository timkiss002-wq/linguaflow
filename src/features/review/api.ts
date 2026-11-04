import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { vocabKeys, type VocabWord } from '@/features/vocabulary/api';
import type { Rating, Schedule } from '@/lib/srs/sm2';
import { getSupabase } from '@/lib/supabase';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/** Ids of cards that got their first-ever rating today (counts against the new-card limit). */
export function useNewReviewedToday() {
  const user = useUser();
  return useQuery({
    queryKey: ['new-reviewed-today', user.id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('vocabulary_reviews')
        .select('vocabulary_id')
        .gte('reviewed_at', startOfToday())
        .eq('prev_interval_days', 0);
      if (error) throw error;
      return new Set(data.map((r) => r.vocabulary_id));
    },
  });
}

export function useRecordReview() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    scope: { id: 'review' },
    mutationFn: async ({ word, rating, next, durationMs }: { word: VocabWord; rating: Rating; next: Schedule; durationMs: number }) => {
      const { data, error } = await getSupabase().rpc('record_review', {
        p_vocabulary_id: word.id,
        p_rating: rating,
        p_new_interval: next.interval_days,
        p_new_ease: next.ease_factor,
        p_new_reps: next.repetitions,
        p_new_status: next.status,
        p_due_at: next.due_at.toISOString(),
        p_duration_ms: Math.min(Math.max(0, Math.round(durationMs)), 3_600_000),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (updated) => {
      qc.setQueryData<VocabWord[]>(vocabKeys.all(user.id), (old) => old?.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
      qc.invalidateQueries({ queryKey: ['new-reviewed-today', user.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['daily-activity'] });
    },
  });
}
