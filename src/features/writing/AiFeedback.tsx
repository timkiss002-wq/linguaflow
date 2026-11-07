import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile, useUpdateProfile } from '@/features/profile/api';
import { DEFAULT_SETTINGS } from '@/features/profile/schemas';
import { cn } from '@/lib/utils';
import { CATEGORIES, type Feedback } from '../../../supabase/functions/_shared/writing-feedback.ts';
import { FEEDBACK_ERRORS, FeedbackError, useRequestFeedback, useWritingFeedback } from './feedback';

/** "AI feedback" card on a writing result: asks for consent once, then calls the Edge Function. */
/** autoStart: ask the AI straight away (after an exam), if the learner has already agreed to AI feedback. */
export function AiFeedback({ submissionId, language, level, autoStart = false }: { submissionId: string; language: 'en' | 'zh'; level: number; autoStart?: boolean }) {
  const stored = useWritingFeedback(submissionId);
  const request = useRequestFeedback(submissionId);
  const profile = useProfile();
  const update = useUpdateProfile();
  const [asking, setAsking] = useState(false);
  const settings = profile.data?.settings ?? DEFAULT_SETTINGS;

  const run = () => request.mutate(level);
  const start = () => (settings.aiFeedback ? run() : setAsking(true));
  const agree = () =>
    update.mutate(
      { settings: { ...settings, aiFeedback: true } },
      {
        onSuccess: () => {
          setAsking(false);
          run();
        },
      },
    );
  const auto = useRef(false);
  useEffect(() => {
    if (!autoStart || auto.current || stored.isPending || stored.data || !profile.data || !settings.aiFeedback) return;
    auto.current = true;
    request.mutate(level);
  }, [autoStart, stored.isPending, stored.data, profile.data, settings.aiFeedback, request, level]);
  const err = request.error instanceof FeedbackError ? request.error : request.error ? new FeedbackError('ai_failed') : null;

  if (stored.isPending) return <Skeleton className="h-40" />;
  const fb = stored.data?.feedback ?? request.data?.feedback;

  return (
    <Card data-testid="ai-feedback">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden /> AI feedback
            {fb && <Badge variant="outline">Gemini · may be wrong</Badge>}
          </CardTitle>
          <CardDescription>
            {fb ? 'Grammar, word choice and ideas — what the automatic checks cannot judge.' : 'Sentence-by-sentence corrections with explanations in Vietnamese, scores on the exam criteria and an improved version of your text.'}
          </CardDescription>
        </div>
        {!fb && (
          <Button onClick={start} disabled={request.isPending || update.isPending}>
            <Sparkles className="size-4" aria-hidden />
            {request.isPending ? 'Reading your text…' : 'Get AI feedback'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {request.isPending && <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds.</p>}
        {err && (
          <Alert variant="destructive" data-testid="ai-error" data-code={err.code}>
            <AlertDescription>{FEEDBACK_ERRORS[err.code] ?? FEEDBACK_ERRORS.ai_failed}</AlertDescription>
          </Alert>
        )}
        {fb && <FeedbackView fb={fb} language={language} />}
      </CardContent>

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogTitle>Send your text to an AI?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Your text and the task are sent to <b>Google Gemini</b> through LinguaFlow's server. On Google's free tier, Google may use what is sent to improve its products —{' '}
                <b>don't include personal information</b> (full names, addresses, phone numbers).
              </p>
              <p>The feedback is saved with your text. AI can be wrong: for important texts, check with a teacher. You can turn this off any time in Settings.</p>
            </div>
          </DialogDescription>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Not now
            </Button>
            <Button onClick={agree} disabled={update.isPending}>
              Agree and continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FeedbackView({ fb, language }: { fb: Feedback; language: 'en' | 'zh' }) {
  const zh = language === 'zh';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div data-testid="ai-overall">
          <p className="text-xs text-muted-foreground">{fb.overall.label}</p>
          <p className="text-3xl font-semibold tabular-nums">
            {fb.overall.score}
            <span className="text-base font-normal text-muted-foreground"> / {fb.overall.max}</span>
          </p>
        </div>
        {fb.levelEstimate && (
          <div>
            <p className="text-xs text-muted-foreground">Reads like</p>
            <p className="text-xl font-semibold">HSK {fb.levelEstimate}</p>
          </div>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2" data-testid="ai-criteria">
        {fb.criteria.map((c) => (
          <li key={c.key} className="rounded-md border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="tabular-nums">
                <b>{c.score}</b>
                <span className="text-xs text-muted-foreground"> / {c.max}</span>
              </p>
            </div>
            <div className="my-1.5 h-1.5 rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${(c.score / c.max) * 100}%`, background: 'var(--chart-1)' }} />
            </div>
            <p className="text-sm text-muted-foreground" lang="vi">
              {c.comment_vi}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-2" lang="vi">
        <p>{fb.summary_vi}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {fb.strengths_vi.length > 0 && (
            <div>
              <p className="text-sm font-medium text-success">Điểm tốt</p>
              <ul className="list-disc pl-5 text-sm">
                {fb.strengths_vi.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {fb.priorities_vi.length > 0 && (
            <div>
              <p className="text-sm font-medium">Nên tập trung tiếp</p>
              <ul className="list-disc pl-5 text-sm">
                {fb.priorities_vi.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Corrections ({fb.corrections.length})</p>
        {fb.corrections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors found.</p>
        ) : (
          <ol className="space-y-2" data-testid="ai-corrections">
            {fb.corrections.map((c, i) => (
              <li key={i} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{CATEGORIES[language][c.category] ?? c.category}</Badge>
                </div>
                <p className={cn('mt-1.5', zh && 'text-lg')} lang={zh ? 'zh-CN' : 'en'}>
                  <span className="text-destructive line-through decoration-destructive/60">{c.original}</span>
                  <ArrowRight className="mx-1.5 inline size-3.5 text-muted-foreground" aria-label="becomes" />
                  <span className="text-success">{c.corrected}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground" lang="vi">
                  {c.explanation_vi}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Improved version</summary>
        <p className={cn('mt-2 whitespace-pre-wrap leading-relaxed', zh && 'text-lg')} lang={zh ? 'zh-CN' : 'en'} data-testid="ai-rewrite">
          {fb.rewrite}
        </p>
      </details>
      <p className="text-xs text-muted-foreground">
        AI feedback can be wrong — treat it as a second opinion. Your repeated error types appear on{' '}
        <Link to="/insights" className="text-primary hover:underline">
          Strengths & Weaknesses
        </Link>
        .
      </p>
    </div>
  );
}
