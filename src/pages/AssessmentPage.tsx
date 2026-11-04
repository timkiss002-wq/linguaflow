import { Check, ClipboardCheck, Snail, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAnswerItem,
  useAssessment,
  useAssessmentReview,
  useLevelOverview,
  useNextItem,
  useNextQuestion,
  useShowResults,
  type Graded,
  type ReviewRow,
  type TestItem,
  type TestResponse,
} from '@/features/assessment/api';
import { SkillLevels } from '@/features/assessment/SkillLevels';
import { SpeechErrorNotice } from '@/features/audio/SpeechErrorNotice';
import { useSpeech } from '@/features/audio/useSpeech';
import { toUserMessage } from '@/lib/errors';
import { levelLabel, SKILL_LABEL } from '@/lib/personal/levels';
import { cn } from '@/lib/utils';

const LANG = { en: 'English', zh: '中文' } as const;

export default function AssessmentPage() {
  const { testId = '' } = useParams();
  const test = useAssessment(testId);
  const t = test.data;

  if (test.isError) return <ErrorState error={test.error} onRetry={() => test.refetch()} />;
  if (test.isPending) return <Skeleton className="h-96" />;
  if (!t)
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Test not found"
        description="This test does not exist or belongs to another account."
        action={
          <Button asChild variant="outline">
            <Link to="/level-test">Back to level tests</Link>
          </Button>
        }
      />
    );
  const title = `${LANG[t.language]} · ${t.kind === 'placement' ? 'Placement test' : 'Check-in'}`;
  return t.finished_at ? <Results testId={testId} title={title} language={t.language} /> : <Runner testId={testId} title={title} language={t.language} />;
}

/* ───────────── taking the test ───────────── */

function Runner({ testId, title, language }: { testId: string; title: string; language: 'en' | 'zh' }) {
  const next = useNextItem(testId, true);
  const answer = useAnswerItem(testId);
  const loadNext = useNextQuestion(testId);
  const showResults = useShowResults(testId);
  const [graded, setGraded] = useState<{ item: TestItem; response: TestResponse; result: Graded } | null>(null);
  const shownAt = useRef(Date.now());
  const item = graded?.item ?? next.data ?? null;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [next.data?.id]);

  const submit = (response: TestResponse) => {
    if (!item || graded || answer.isPending) return;
    answer.mutate(
      { item: item.id, response, durationMs: Date.now() - shownAt.current },
      { onSuccess: (result) => setGraded({ item, response, result }), onError: (e) => toast.error(toUserMessage(e)) },
    );
  };
  const [advancing, setAdvancing] = useState(false);
  const goOn = async () => {
    if (!graded || advancing) return;
    setAdvancing(true);
    try {
      if (graded.result.finished) {
        await showResults(); // the test row now has finished_at → the page shows the results
        return;
      }
      await loadNext();
      setGraded(null);
    } finally {
      setAdvancing(false);
    }
  };

  if (next.isError) return <ErrorState error={next.error} onRetry={() => next.refetch()} />;
  return (
    <>
      <PageHeader title={title} description="Answer without a dictionary. “I don't know” is better than guessing — it keeps your level accurate." />
      {!item ? (
        next.isFetching ? <Skeleton className="h-72" /> : <p className="text-sm text-muted-foreground">No more questions.</p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Question <b className="tabular-nums text-foreground">{item.number}</b> / {item.total}
              </span>
              <Badge variant="outline">{SKILL_LABEL[item.skill]}</Badge>
            </div>
            <Progress value={((item.number - (graded ? 0 : 1)) / item.total) * 100} label="Test progress" />
          </div>
          <Question key={item.id} item={item} language={language} graded={graded?.item.id === item.id ? graded : null} busy={answer.isPending || advancing} onSubmit={submit} onNext={goOn} />
        </div>
      )}
    </>
  );
}

function Question({
  item,
  language,
  graded,
  busy,
  onSubmit,
  onNext,
}: {
  item: TestItem;
  language: 'en' | 'zh';
  graded: { response: TestResponse; result: Graded } | null;
  busy: boolean;
  onSubmit: (r: TestResponse) => void;
  onNext: () => void;
}) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (graded) nextRef.current?.focus();
  }, [graded]);

  return (
    <Card data-item={item.id}>
      <CardContent className="space-y-5 pt-6" lang={language === 'zh' ? 'zh-CN' : 'en'}>
        {item.audio && <AudioButtons text={item.audio} language={language} itemId={item.id} />}
        {item.passage && (
          <blockquote className={cn('rounded-md border-l-4 border-primary/40 bg-muted/50 p-4 leading-relaxed', language === 'zh' && 'text-lg')} data-testid="passage">
            {item.passage}
          </blockquote>
        )}
        <p className={cn('font-medium', language === 'zh' ? 'text-xl' : 'text-lg')} data-testid="prompt">
          {item.prompt}
        </p>
        {item.kind === 'choice' ? (
          <ChoiceAnswer item={item} graded={graded} busy={busy} onSubmit={onSubmit} />
        ) : (
          <OrderAnswer item={item} language={language} graded={graded} busy={busy} onSubmit={onSubmit} />
        )}
        {graded && (
          <div className={cn('space-y-2 rounded-md border p-3', graded.result.correct ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5')} role="status" lang="vi">
            <p className="flex items-center gap-1.5 font-medium">
              {graded.result.correct ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-destructive" aria-hidden />}
              {graded.result.correct ? 'Correct' : 'Not quite'}
            </p>
            {!graded.result.correct && item.kind === 'order' && Array.isArray(graded.result.answer) && (
              <p lang={language === 'zh' ? 'zh-CN' : 'en'}>
                Answer: <b>{graded.result.answer[0]}</b>
              </p>
            )}
            {graded.result.explanation_vi && <p className="text-sm text-muted-foreground">{graded.result.explanation_vi}</p>}
            <Button ref={nextRef} onClick={onNext} disabled={busy}>
              {graded.result.finished ? 'See my results' : 'Next question'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AudioButtons({ text, language, itemId }: { text: string; language: 'en' | 'zh'; itemId: string }) {
  const speech = useSpeech(language);
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    void speech.play(itemId, text, 1);
  }, [itemId, text, speech]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => speech.play(itemId, text, 1)} aria-label="Play audio">
          <Volume2 className="size-4" aria-hidden />
          {speech.playingKey === itemId ? 'Playing…' : 'Play'}
        </Button>
        <Button variant="ghost" onClick={() => speech.play(itemId, text, 0.7)} aria-label="Play slowly">
          <Snail className="size-4" aria-hidden />
          Slow
        </Button>
      </div>
      {speech.error && <SpeechErrorNotice error={speech.error} language={language} />}
    </div>
  );
}

function ChoiceAnswer({ item, graded, busy, onSubmit }: { item: TestItem; graded: { response: TestResponse; result: Graded } | null; busy: boolean; onSubmit: (r: TestResponse) => void }) {
  const picked = graded && 'choice' in graded.response ? graded.response.choice : null;
  const right = graded && typeof graded.result.answer === 'number' ? graded.result.answer : null;

  useEffect(() => {
    if (graded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= item.options.length) onSubmit({ choice: n - 1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [graded, item.options.length, onSubmit]);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Answers">
        {item.options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={!!graded || busy}
            onClick={() => onSubmit({ choice: i })}
            className={cn(
              'flex items-start gap-3 rounded-md border bg-card px-3 py-2.5 text-left transition-colors enabled:hover:border-primary enabled:hover:bg-muted/50',
              right === i && 'border-success bg-success/10',
              picked === i && right !== i && 'border-destructive bg-destructive/10',
            )}
          >
            <span className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground" aria-hidden>
              {i + 1}
            </span>
            <span>{o}</span>
          </button>
        ))}
      </div>
      {!graded && (
        <button type="button" disabled={busy} onClick={() => onSubmit({ choice: -1 })} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          I don't know
        </button>
      )}
      {graded && picked === -1 && <p className="text-sm text-muted-foreground">You chose “I don't know”.</p>}
    </div>
  );
}

function OrderAnswer({ item, language, graded, busy, onSubmit }: { item: TestItem; language: 'en' | 'zh'; graded: { response: TestResponse; result: Graded } | null; busy: boolean; onSubmit: (r: TestResponse) => void }) {
  // indexes into item.options, so repeated tokens stay distinct
  const [chosen, setChosen] = useState<number[]>([]);
  const left = item.options.map((t, i) => ({ t, i })).filter(({ i }) => !chosen.includes(i));
  const sentence = chosen.map((i) => item.options[i]).join(language === 'zh' ? '' : ' ');
  const locked = !!graded || busy;

  return (
    <div className="space-y-3">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-md border border-dashed p-2" aria-label="Your sentence" data-testid="order-line">
        {chosen.length === 0 && <span className="text-sm text-muted-foreground">Tap the words in the right order</span>}
        {chosen.map((i) => (
          <button key={i} type="button" disabled={locked} onClick={() => setChosen((c) => c.filter((x) => x !== i))} className="rounded bg-primary/10 px-2 py-1 text-base enabled:hover:bg-primary/20" aria-label={`Remove ${item.options[i]}`}>
            {item.options[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Words">
        {left.map(({ t, i }) => (
          <button key={i} type="button" disabled={locked} onClick={() => setChosen((c) => [...c, i])} className="rounded border bg-card px-2 py-1 text-base enabled:hover:border-primary">
            {t}
          </button>
        ))}
      </div>
      {!graded && (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={left.length > 0 || busy} onClick={() => onSubmit({ order: chosen.map((i) => item.options[i]!) })}>
            Check
          </Button>
          <Button variant="ghost" disabled={chosen.length === 0 || busy} onClick={() => setChosen([])}>
            Clear
          </Button>
          <button type="button" disabled={busy} onClick={() => onSubmit({ order: [] })} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            I don't know
          </button>
        </div>
      )}
      {graded && sentence && <p className="text-sm text-muted-foreground">You wrote: {sentence}</p>}
    </div>
  );
}

/* ───────────── results ───────────── */

function Results({ testId, title, language }: { testId: string; title: string; language: 'en' | 'zh' }) {
  const review = useAssessmentReview(testId, true);
  const overview = useLevelOverview();
  const data = review.data;

  // ratings as they were at the end of THIS test, and of the test before it
  const { ratings, previous } = useMemo(() => {
    const h = overview.data?.history.filter((x) => x.language === language) ?? [];
    const ids = [...new Set(h.map((x) => x.assessment_id))];
    const at = ids.indexOf(testId);
    const prevId = at > 0 ? ids[at - 1] : undefined;
    return {
      ratings: h.filter((x) => x.assessment_id === testId),
      previous: prevId ? Object.fromEntries(h.filter((x) => x.assessment_id === prevId).map((x) => [x.skill, x.rating])) : undefined,
    };
  }, [overview.data, language, testId]);

  if (review.isError) return <ErrorState error={review.error} onRetry={() => review.refetch()} />;
  if (!data || !overview.data) return <Skeleton className="h-96" />;

  const rows = data.responses;
  const correct = rows.filter((r) => r.correct).length;
  const weakPoints = [...new Map(rows.filter((r) => !r.correct && r.point).map((r) => [r.point!, r])).values()];

  return (
    <>
      <PageHeader
        title={title}
        description={`Finished ${new Date(data.assessment.finished_at!).toLocaleString()} · ${correct} of ${rows.length} correct`}
        actions={
          <Button asChild variant="outline">
            <Link to="/level-test">All level tests</Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="result-levels">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your level by skill</CardTitle>
            <CardDescription>The hardest level where you would get about half the questions right — easier levels you get right more often. ▲▼ = change since your previous test.</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillLevels language={language} ratings={ratings} previous={previous} />
          </CardContent>
        </Card>
        <Card data-testid="weak-points">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grammar to review</CardTitle>
          </CardHeader>
          <CardContent>
            {weakPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No grammar point was missed in this test.</p>
            ) : (
              <ul className="divide-y">
                {weakPoints.map((r) => (
                  <li key={r.point} className="py-2 first:pt-0 last:pb-0">
                    <p className="font-medium">
                      {r.point_name} <span className="text-xs font-normal text-muted-foreground">· {levelLabel(language, r.level)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground" lang="vi">
                      {r.point_vi}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your answers</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="divide-y" data-testid="answers">
            {rows.map((r, i) => (
              <AnswerRow key={r.item_id} n={i + 1} row={r} language={language} />
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  );
}

function AnswerRow({ n, row: r, language }: { n: number; row: ReviewRow; language: 'en' | 'zh' }) {
  const sep = language === 'zh' ? '' : ' ';
  const yours =
    'choice' in r.response
      ? r.response.choice < 0
        ? "I don't know"
        : r.options[r.response.choice]
      : r.response.order.length
        ? r.response.order.join(sep)
        : "I don't know";
  const right = typeof r.answer === 'number' ? r.options[r.answer] : r.answer[0];
  return (
    <li className="space-y-1 py-3 first:pt-0" data-correct={r.correct}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{n}.</span>
        <Badge variant="outline">{SKILL_LABEL[r.skill]}</Badge>
        <span>{levelLabel(language, r.level)}</span>
        {r.correct ? <Check className="size-4 text-success" aria-label="correct" /> : <X className="size-4 text-destructive" aria-label="wrong" />}
      </div>
      <div lang={language === 'zh' ? 'zh-CN' : 'en'}>
        {r.audio && <p className="text-sm text-muted-foreground">Audio: {r.audio}</p>}
        {r.passage && <p className="line-clamp-3 text-sm text-muted-foreground">{r.passage}</p>}
        <p>{r.prompt}</p>
        <p className="text-sm">
          {!r.correct && (
            <>
              <span className="text-destructive">Yours: {yours}</span>
              {' · '}
            </>
          )}
          <span className="text-success">Answer: {right}</span>
        </p>
      </div>
      {r.explanation_vi && (
        <p className="text-sm text-muted-foreground" lang="vi">
          {r.explanation_vi}
        </p>
      )}
    </li>
  );
}
