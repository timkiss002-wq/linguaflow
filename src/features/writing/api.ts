import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLevelOverview } from '@/features/assessment/api';
import { useUser } from '@/features/auth/useAuth';
import { useLearner } from '@/features/learner/api';
import { useVocabulary } from '@/features/vocabulary/api';
import type { Exam } from '@/lib/personal/goals';
import { ratingToLevel, startLevel } from '@/lib/personal/levels';
import type { Lang, Metrics } from '@/lib/writing/analyze';
import type { WritingTask } from '@/lib/writing/tasks';
import { getSupabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/database';

export type Submission = Omit<Tables<'writing_submissions'>, 'metrics'> & { metrics: Metrics };

const keys = {
  tasks: ['writing', 'tasks'] as const,
  list: (uid: string) => ['writing', 'submissions', uid] as const,
  one: (id: string) => ['writing', 'submission', id] as const,
};

export function useWritingTasks() {
  return useQuery({
    queryKey: keys.tasks,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      // admins can read switched-off prompts too; learners only get active ones (RLS), so filter for everyone
      const { data, error } = await getSupabase().from('writing_tasks').select('*').eq('is_active', true).order('level_min');
      if (error) throw error;
      return data as WritingTask[];
    },
  });
}

/** All of the learner's texts, newest first (without the full text, which only the result page needs). */
export function useSubmissions() {
  const user = useUser();
  return useQuery({
    queryKey: keys.list(user.id),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('writing_submissions')
        .select('id, language, task_id, title, target_words, metrics, duration_seconds, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Omit<Submission, 'body' | 'prompt' | 'user_id'>[];
    },
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: keys.one(id),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('writing_submissions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as unknown as Submission | null;
    },
  });
}

export function useSaveSubmission() {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: async (v: { language: Lang; taskId: string; title: string; prompt: string; targets: string[]; body: string; metrics: Metrics; seconds: number }) => {
      const { data, error } = await getSupabase()
        .from('writing_submissions')
        .insert({
          language: v.language,
          task_id: v.taskId,
          title: v.title,
          prompt: v.prompt,
          target_words: v.targets,
          body: v.body,
          metrics: v.metrics as unknown as NonNullable<Json>,
          duration_seconds: v.seconds,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list(user.id) });
      qc.invalidateQueries({ queryKey: ['plan', 'progress'] });
    },
  });
}

export function useDeleteSubmission() {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('writing_submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(user.id) }),
  });
}

/** HSK 2.0 level of each word (words not in the list are left out). */
export async function fetchHskLevels(words: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(words)];
  for (let i = 0; i < unique.length; i += 150) {
    const { data, error } = await getSupabase().from('hsk_words').select('word, level_v2, level_v3').in('word', unique.slice(i, i + 150));
    if (error) throw error;
    // HSK 3.0 levels 7–9 count as 6 on the 6-level scale
    for (const r of data) out.set(r.word, r.level_v2 ?? (r.level_v3 ? Math.min(6, r.level_v3) : 0));
  }
  return out;
}

/**
 * Level used to pick prompts (1–6): grammar level from the level test if there is one, else the profile goal, else 3.
 * Also returns the learner's exam and interests.
 */
export function useWritingProfile(language: Lang) {
  const learner = useLearner();
  const overview = useLevelOverview();
  const vocab = useVocabulary();
  if (!learner.data || !overview.data || !vocab.data) return undefined;
  const goal = learner.data.goals.find((g) => g.language === language);
  const grammar = overview.data.tests.some((t) => t.language === language && t.finished_at)
    ? overview.data.ratings.find((r) => r.language === language && r.skill === 'grammar')
    : undefined;
  const level = grammar
    ? { value: Math.max(1, ratingToLevel(grammar.rating)), source: 'your grammar level from the level test' }
    : goal
      ? { value: startLevel({ exam: goal.exam as Exam, current_level: goal.current_level }), source: 'the level in your profile' }
      : { value: 3, source: 'a middle level (set a goal or take the level test to adjust it)' };
  const notebook = vocab.data.filter((w) => w.language === language && (w.status === 'new' || w.status === 'learning')).map((w) => w.term);
  return { level, exam: goal?.exam ?? null, interests: learner.data.profile?.interests ?? [], notebook };
}
