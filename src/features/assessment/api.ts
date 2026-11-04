import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import type { TestSkill } from '@/lib/personal/levels';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Assessment = Tables<'assessments'>;
export type SkillRating = Tables<'user_skill_ratings'>;
export type SkillHistory = Tables<'user_skill_ratings_history'>;
export type SkillResult = Partial<Record<TestSkill, { rating: number; n: number; correct: number; total: number }>>;

/** A question as the server sends it: no answer. */
export interface TestItem {
  id: string;
  skill: TestSkill;
  kind: 'choice' | 'order';
  level: number;
  prompt: string;
  passage: string | null;
  audio: string | null;
  options: string[];
  number: number;
  total: number;
}

export interface Graded {
  correct: boolean;
  /** choice: index of the right option; order: accepted sentences */
  answer: number | string[];
  explanation_vi: string | null;
  finished: boolean;
}

export type TestResponse = { choice: number } | { order: string[] };

export interface ReviewRow {
  item_id: string;
  skill: TestSkill;
  kind: 'choice' | 'order';
  level: number;
  prompt: string;
  passage: string | null;
  audio: string | null;
  options: string[];
  answer: number | string[];
  explanation_vi: string | null;
  point: string | null;
  point_name: string | null;
  point_vi: string | null;
  response: TestResponse;
  correct: boolean;
}

const keys = {
  overview: (uid: string) => ['level-test', uid] as const,
  test: (id: string) => ['level-test', 'test', id] as const,
  next: (id: string) => ['level-test', 'next', id] as const,
  review: (id: string) => ['level-test', 'review', id] as const,
};

/** Ratings, rating history and all tests of the signed-in learner. */
export function useLevelOverview() {
  const user = useUser();
  return useQuery({
    queryKey: keys.overview(user.id),
    queryFn: async () => {
      const sb = getSupabase();
      const [r, h, a] = await Promise.all([
        sb.from('user_skill_ratings').select('*'),
        sb.from('user_skill_ratings_history').select('*').order('recorded_at'),
        sb.from('assessments').select('*').order('started_at', { ascending: false }).limit(50),
      ]);
      if (r.error) throw r.error;
      if (h.error) throw h.error;
      if (a.error) throw a.error;
      return { ratings: r.data, history: h.data, tests: a.data };
    },
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: keys.test(id),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('assessments').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useNextItem(id: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.next(id),
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('next_assessment_item', { p_assessment: id });
      if (error) throw error;
      return (data as unknown as TestItem | null) ?? null;
    },
  });
}

export function useStartTest() {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: async (v: { language: 'en' | 'zh'; kind: 'placement' | 'checkin'; startLevel: number }) => {
      const { data, error } = await getSupabase().rpc('start_assessment', { p_language: v.language, p_kind: v.kind, p_start_level: v.startLevel });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.overview(user.id) }),
  });
}

export function useAnswerItem(id: string) {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    // one answer at a time
    scope: { id: `level-test-${id}` },
    mutationFn: async (v: { item: string; response: TestResponse; durationMs: number }) => {
      const { data, error } = await getSupabase().rpc('answer_assessment_item', {
        p_assessment: id,
        p_item: v.item,
        p_response: v.response,
        p_duration_ms: Math.max(0, Math.round(v.durationMs)),
      });
      if (error) throw error;
      return data as unknown as Graded;
    },
    // the page shows the last answer's feedback first; useShowResults() switches to the results
    onSuccess: (g) => {
      if (g.finished) qc.invalidateQueries({ queryKey: keys.overview(user.id) });
    },
  });
}

export function useNextQuestion(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.next(id) });
}

export function useShowResults(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.test(id) });
}

export function useAssessmentReview(id: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.review(id),
    enabled,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_assessment_review', { p_assessment: id });
      if (error) throw error;
      return data as unknown as { assessment: Assessment; responses: ReviewRow[] } | null;
    },
  });
}
