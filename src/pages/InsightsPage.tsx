import { ArrowRight, Check, Lightbulb, ThumbsUp, TriangleAlert, X } from 'lucide-react';
import { useStudyLanguage } from '@/features/study/context';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIeltsAttempts } from '@/features/ielts/api';
import { useInsightData } from '@/features/insights/api';
import { buildDrill, type DrillItem } from '@/features/insights/drill';
import { useLearner } from '@/features/learner/api';
import { HBarList } from '@/features/stats/charts';
import { useWordFamilyIndex } from '@/features/wordforms/api';
import { useAllFeedback } from '@/features/writing/feedback';
import { buildInsights, MIN, SLOT_LABEL, type Insight, type InsightData, type Slot } from '@/lib/personal/insights';
import { cn } from '@/lib/utils';

const RANGES = [30, 60, 90] as const;
const LANG_LABEL = { en: 'English', zh: '中文' } as const;

export default function InsightsPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(60);
  const data = useInsightData(days);
  const learner = useLearner();
  const index = useWordFamilyIndex();
  const { lang } = useStudyLanguage();
  const feedback = useAllFeedback();
  const ielts = useIeltsAttempts();
  const profile = learner.data?.profile;
  // No profile yet (onboarding skipped) → same defaults as the database: habits on, every day planned.
  const habitAnalysis = profile?.habit_analysis ?? true;
  const plannedDays = profile?.study_days.length ?? 7;

  const insights = useMemo(
    () =>
      data.data
        ? buildInsights(data.data, {
            sameFamily: index?.sameFamily,
            habitAnalysis,
            plannedDays,
            writing: feedback.data?.map((f) => ({ language: f.feedback.language, corrections: f.feedback.corrections })),
            ielts: ielts.data?.flatMap((a) => a.results.map((r) => ({ skill: a.skill, type: r.type, mark: r.mark }))),
          })
        : [],
    [data.data, index, habitAnalysis, plannedDays, feedback.data, ielts.data],
  );
  const drill = useMemo(() => (data.data && lang === 'zh' ? buildDrill(data.data.pairs) : []), [data.data, lang]);

  const d = data.data;
  const checked = (d?.sentences.en?.n ?? 0) + (d?.sentences.zh?.n ?? 0);
  const reviews = d?.reviews.reduce((n, r) => n + r.count, 0) ?? 0;
  const mine = insights.filter((i) => !i.language || i.language === lang);
  const strengths = mine.filter((i) => i.kind === 'strength' && i.area !== 'habits');
  const weaknesses = mine.filter((i) => i.kind === 'weakness' && i.area !== 'habits');
  const habits = mine.filter((i) => i.area === 'habits');

  return (
    <>
      <PageHeader
        title="Điểm mạnh & yếu"
        description="Câu trả lời của bạn nói gì về khả năng nghe, chữ Hán, dạng từ và trí nhớ — kèm bằng chứng cho từng nhận xét."
        actions={
          <div className="flex gap-1 rounded-md border bg-card p-1" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)} className={cn('rounded px-2.5 py-1.5 text-sm font-medium', days === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {r}d
              </button>
            ))}
          </div>
        }
      />

      {data.isError ? (
        <ErrorState error={data.error} onRetry={() => data.refetch()} />
      ) : !d || learner.isPending ? (
        <Skeleton className="h-96" />
      ) : mine.length === 0 && drill.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough answers yet"
          description={
            <>
              <p>Conclusions need evidence, so nothing is shown from just a few answers.</p>
              <ul className="mt-3 space-y-1 text-left" data-testid="insight-progress">
                <li>
                  Sentences checked in dictation: <b className="tabular-nums">{checked}</b> / {MIN.sentences}
                </li>
                <li>
                  Flashcard reviews: <b className="tabular-nums">{reviews}</b> / {MIN.reviews}
                </li>
              </ul>
            </>
          }
          action={
            <Button asChild>
              <Link to="/lessons">Practise a lesson</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Based on the last {days} days: {checked} checked sentences, {reviews} flashcard reviews. Answers you revealed or skipped are not counted.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <InsightList testId="weaknesses" title="To work on" icon={TriangleAlert} items={weaknesses} empty="No repeated weak spot found. Keep practising — patterns show up after a few lessons." />
            <InsightList testId="strengths" title="Strengths" icon={ThumbsUp} items={strengths} empty={`Strengths appear after ${MIN.sentences} checked sentences in a language, or ${MIN.reviews} reviews.`} />
          </div>

          {drill.length > 0 && <Drill items={drill} />}

          <HabitsSection data={d} items={habits} enabled={habitAnalysis} />
        </div>
      )}
    </>
  );
}

function InsightList({ title, icon: Icon, items, empty, testId }: { title: string; icon: typeof Lightbulb; items: Insight[]; empty: string; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {items.map((i) => (
              <InsightItem key={i.id} insight={i} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InsightItem({ insight: i }: { insight: Insight }) {
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0" data-insight={i.id}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{i.title}</p>
        {i.language && <Badge variant="outline">{LANG_LABEL[i.language]}</Badge>}
      </div>
      <p className="text-sm">{i.detail}</p>
      {i.examples && i.examples.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {i.examples.map((e, n) => (
            <span key={`${n}:${e}`} className="rounded bg-muted px-1.5 py-0.5 text-sm" lang={i.language === 'zh' ? 'zh-CN' : undefined}>
              {e}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Based on: {i.evidence}</p>
        {i.action &&
          (i.action.href.startsWith('#') ? (
            <a href={i.action.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {i.action.label} <ArrowRight className="size-3.5" aria-hidden />
            </a>
          ) : (
            <Link to={i.action.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {i.action.label} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ))}
      </div>
    </li>
  );
}

function Drill({ items }: { items: DrillItem[] }) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const done = at >= items.length;
  const item = items[at];

  const pick = (c: string) => {
    if (picked) return;
    setPicked(c);
    if (c === item!.answer) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    setAt((n) => n + 1);
  };
  const restart = () => {
    setAt(0);
    setScore(0);
    setPicked(null);
  };

  return (
    <Card id="drill" data-testid="drill" className="scroll-mt-20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Same-sound characters</CardTitle>
        <CardDescription>Pairs you mixed up in dictation, in the sentence where it happened. Choose the character that fits. (Practice only — not saved.)</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium" data-testid="drill-score">
              {score} / {items.length} correct
            </p>
            <Button variant="outline" onClick={restart}>
              Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {at + 1} / {items.length}
            </p>
            <p className="text-2xl leading-relaxed" lang="zh-CN" data-testid="drill-sentence">
              {item!.before}
              <span className={cn('mx-0.5 inline-block min-w-[1.5em] border-b-2 text-center', picked ? (picked === item!.answer ? 'border-success text-success' : 'border-destructive text-destructive') : 'border-primary')}>
                {picked ? item!.answer : ' '}
              </span>
              {item!.after}
            </p>
            <div className="flex gap-3">
              {item!.options.map((c) => (
                <Button
                  key={c}
                  variant="outline"
                  size="lg"
                  lang="zh-CN"
                  aria-label={`Choose ${c}`}
                  onClick={() => pick(c)}
                  className={cn('min-w-16 text-2xl', picked && c === item!.answer && 'border-success', picked === c && c !== item!.answer && 'border-destructive')}
                >
                  {c}
                </Button>
              ))}
            </div>
            {picked && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-1.5 text-sm" role="status">
                  {picked === item!.answer ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-destructive" aria-hidden />}
                  {picked === item!.answer ? 'Correct' : `It's ${item!.answer}`}
                </p>
                <Button size="sm" onClick={next}>
                  {at + 1 < items.length ? 'Next' : 'Finish'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SLOTS: Slot[] = ['morning', 'afternoon', 'evening', 'night'];

function HabitsSection({ data, items, enabled }: { data: InsightData; items: Insight[]; enabled: boolean }) {
  return (
    <Card data-testid="habits">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Study habits</CardTitle>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            Habit analysis is off. Turn on “Learn from my study habits” in your{' '}
            <Link to="/onboarding" className="font-medium text-primary hover:underline">
              learning profile
            </Link>{' '}
            to see when you study best.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Minutes by time of day</p>
              <HBarList unit=" min" items={SLOTS.map((s) => ({ label: SLOT_LABEL[s][0]!.toUpperCase() + SLOT_LABEL[s].slice(1), value: data.habits.slots[s]?.minutes ?? 0 }))} />
              <p className="mt-3 text-xs text-muted-foreground">
                Active days in the last 2 weeks: {data.habits.active_days_14}
                {data.habits.avg_session_minutes !== null && ` · average session ${data.habits.avg_session_minutes} min`}
              </p>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No habit pattern yet — it needs answers at two different times of day, or a few study days in your plan.</p>
            ) : (
              <ul className="divide-y">
                {items.map((i) => (
                  <InsightItem key={i.id} insight={i} />
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
