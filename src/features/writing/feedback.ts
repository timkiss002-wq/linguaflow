import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { anonKey, functionUrl, getSupabase } from '@/lib/supabase';
import type { Feedback } from '../../../supabase/functions/_shared/writing-feedback.ts';

export type { Feedback };

const keys = {
  one: (id: string) => ['writing', 'feedback', id] as const,
  all: (uid: string) => ['writing', 'feedback-all', uid] as const,
};

/** Stored AI feedback for a text, or null. */
export function useWritingFeedback(submissionId: string) {
  return useQuery({
    queryKey: keys.one(submissionId),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('writing_feedback').select('feedback, model, created_at').eq('submission_id', submissionId).maybeSingle();
      if (error) throw error;
      return data ? { ...data, feedback: data.feedback as unknown as Feedback } : null;
    },
  });
}

/** All AI feedback of the learner (for the strengths & weaknesses page). */
export function useAllFeedback() {
  const user = useUser();
  return useQuery({
    queryKey: keys.all(user.id),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('writing_feedback').select('submission_id, feedback').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data.map((r) => ({ submissionId: r.submission_id, feedback: r.feedback as unknown as Feedback }));
    },
  });
}

export class FeedbackError extends Error {
  constructor(
    public code: string,
    public limit?: number,
  ) {
    super(code);
  }
}

export const FEEDBACK_ERRORS: Record<string, string> = {
  not_configured: 'AI feedback is not set up on this server yet. (Admin: set the GEMINI_API_KEY secret and deploy the writing-feedback function — see docs/DEPLOY.md.)',
  limit: "You've used today's AI reviews. Try again tomorrow — the automatic analysis above is always available.",
  ai_busy: 'The AI service is busy (free-tier limit). Try again in a minute.',
  ai_failed: "The AI service didn't answer. Try again in a minute.",
  ai_invalid: 'The AI answer could not be used. Try again.',
  unauthorized: 'Your session has expired. Sign in again.',
  not_found: 'This text was not found.',
  network: 'Could not reach the AI feedback service. Check your connection.',
};

export function useRequestFeedback(submissionId: string) {
  const qc = useQueryClient();
  const user = useUser();
  return useMutation({
    scope: { id: `feedback-${submissionId}` },
    mutationFn: async (level: number) => {
      const { data } = await getSupabase().auth.getSession();
      let res: Response;
      try {
        res = await fetch(functionUrl('writing-feedback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${data.session?.access_token ?? ''}` },
          body: JSON.stringify({ submission_id: submissionId, level }),
        });
      } catch {
        throw new FeedbackError('network');
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new FeedbackError(body.error ?? 'ai_failed', body.limit);
      return body as { feedback: Feedback; cached: boolean; remaining?: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.one(submissionId) });
      qc.invalidateQueries({ queryKey: keys.all(user.id) });
      qc.invalidateQueries({ queryKey: ['writing', 'submissions'] });
    },
  });
}
