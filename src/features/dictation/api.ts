import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@/features/auth/useAuth';
import { libraryKeys } from '@/features/library/api';
import type { CompareResult } from '@/lib/compare';
import { anonKey, getSupabase, restUrl } from '@/lib/supabase';
import type { Json } from '@/types/database';

/** Sentence ids this learner already finished (correct or revealed) in earlier sessions. */
export function useFinishedSentences(lessonId: string, sentenceIds: string[]) {
  const user = useUser();
  return useQuery({
    queryKey: ['finished-sentences', user.id, lessonId],
    enabled: sentenceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('dictation_attempts')
        .select('sentence_id')
        .in('sentence_id', sentenceIds)
        .or('is_correct.eq.true,answer_revealed.eq.true');
      if (error) throw error;
      return new Set(data.map((r) => r.sentence_id));
    },
  });
}

/** Ensures a learning_progress row exists and marks the lesson as studied now. Never resets status. */
export async function touchProgress(userId: string, lessonId: string) {
  const { error } = await getSupabase()
    .from('learning_progress')
    .upsert({ user_id: userId, lesson_id: lessonId, last_studied_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
}

export interface AttemptInput {
  sentenceId: string;
  sessionId: string | null;
  input: string;
  result: CompareResult | null;
  hintsUsed: number;
  revealed?: boolean;
  skipped?: boolean;
  durationMs: number;
}

function errorSummary(result: CompareResult | null): { [key: string]: Json } {
  if (!result) return {};
  const counts = Object.fromEntries(Object.entries(result.counts).filter(([, v]) => v > 0));
  return result.confusions.length ? { ...counts, confusions: result.confusions } : counts;
}

export function useRecordAttempt(lessonId: string) {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    // Attempts are written in order, so progress always reflects the latest action.
    scope: { id: `attempts-${lessonId}` },
    mutationFn: async (a: AttemptInput & { position: number; lessonCompleted: boolean }) => {
      const sb = getSupabase();
      const { error } = await sb.from('dictation_attempts').insert({
        sentence_id: a.sentenceId,
        session_id: a.sessionId,
        user_input: a.input.slice(0, 2000),
        accuracy: a.skipped ? 0 : (a.result?.accuracy ?? 0),
        is_correct: Boolean(a.result?.isCorrect) && !a.revealed && !a.skipped,
        error_summary: errorSummary(a.result),
        hints_used: a.hintsUsed,
        answer_revealed: Boolean(a.revealed),
        skipped: Boolean(a.skipped),
        duration_ms: Math.max(0, Math.min(a.durationMs, 3_600_000)),
      });
      if (error) throw error;

      const now = new Date().toISOString();
      const { error: pErr } = await sb
        .from('learning_progress')
        .update(
          a.lessonCompleted
            ? { last_sentence_position: a.position, last_studied_at: now, status: 'completed', completed_at: now }
            : { last_sentence_position: a.position, last_studied_at: now },
        )
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: libraryKeys.progress(user.id) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['daily-activity'] });
    },
  });
}

const IDLE_AFTER_MS = 60_000;
const FLUSH_EVERY_MS = 30_000;

/**
 * Records real study time: a second counts only while the tab is visible and the learner
 * interacted within the last minute. The row is created on the first counted second (so idle
 * visits leave nothing behind), saved every 30 s, on hide, on unmount and on page close.
 */
export function useStudySession(language: 'en' | 'zh', lessonId: string | null, kind: 'dictation' | 'review' = 'dictation') {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const { session } = useAuth();
  const tokenRef = useRef(session?.access_token);
  tokenRef.current = session?.access_token;
  const ensureRef = useRef<() => Promise<string | null>>(async () => null);

  useEffect(() => {
    const sb = getSupabase();
    let id: string | null = null;
    let creating: Promise<void> | null = null;
    let seconds = 0;
    let saved = 0;
    let lastInteraction = Date.now();
    let alive = true;

    const create = () => {
      creating ??= (async () => {
        const { data, error } = await sb
          .from('study_sessions')
          .insert({ kind, language, lesson_id: lessonId, active_seconds: seconds })
          .select('id')
          .single();
        if (error || !data) {
          creating = null; // retry on the next flush
          return;
        }
        id = data.id;
        saved = seconds;
        if (alive) setSessionId(data.id);
      })();
      return creating;
    };

    const flush = async () => {
      if (seconds === 0 || seconds === saved) return;
      if (!id) return void (await create());
      const value = seconds;
      const { error } = await sb
        .from('study_sessions')
        .update({ active_seconds: Math.min(value, 86_400), last_active_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) saved = value;
    };

    // Answers need a session id: create the row on demand (counts as activity).
    ensureRef.current = async () => {
      if (!id) {
        if (seconds === 0) {
          seconds = 1;
          setActiveSeconds(1);
        }
        await create();
      }
      return id;
    };

    const mark = () => (lastInteraction = Date.now());
    const events = ['keydown', 'pointerdown', 'input'] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const tick = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastInteraction >= IDLE_AFTER_MS) return;
      seconds += 1;
      setActiveSeconds(seconds);
      if (seconds === 1) void create();
    }, 1000);
    const saver = setInterval(() => void flush(), FLUSH_EVERY_MS);
    const onVisibility = () => document.visibilityState === 'hidden' && void flush();
    document.addEventListener('visibilitychange', onVisibility);

    // Reload / tab close: React cleanup doesn't run, so use a keepalive request that the browser
    // completes after the page is gone.
    const onPageHide = () => {
      if (seconds === 0 || seconds === saved || !tokenRef.current) return;
      const body = { active_seconds: Math.min(seconds, 86_400), last_active_at: new Date().toISOString() };
      void fetch(restUrl(id ? `study_sessions?id=eq.${id}` : 'study_sessions'), {
        method: id ? 'PATCH' : 'POST',
        keepalive: true,
        headers: { apikey: anonKey, Authorization: `Bearer ${tokenRef.current}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(id ? body : { ...body, kind, language, lesson_id: lessonId }),
      }).catch(() => {});
      saved = seconds;
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(saver);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      events.forEach((e) => window.removeEventListener(e, mark));
      void (creating ?? Promise.resolve()).then(flush);
    };
  }, [language, lessonId, kind]);

  const ensureSession = useCallback(() => ensureRef.current(), []);
  return { sessionId, activeSeconds, ensureSession };
}

/** Words saved from this lesson since the session started (vocabulary arrives in M5). */
export function useWordsSavedSince(lessonId: string, since: string, enabled: boolean) {
  const user = useUser();
  return useQuery({
    queryKey: ['words-saved', user.id, lessonId, since],
    enabled,
    queryFn: async () => {
      const { count, error } = await getSupabase()
        .from('vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('source_lesson_id', lessonId)
        .gte('created_at', since);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
