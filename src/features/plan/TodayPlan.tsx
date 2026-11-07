import { BookOpenCheck, Check, ClipboardCheck, Dumbbell, Headphones, Layers, PenLine, RefreshCw, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/errors';
import { buildPlan, countSkips, itemProgress, type PlanItem, type PlanKind, type TodayProgress } from '@/lib/personal/plan';
import { TONE, type Tone } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';
import { usePlanProgress, useRebuildPlan, useSavePlan, useSetItemStatus, useStoredPlans, type StoredPlan } from './api';
import { useStudyLanguage } from '@/features/study/context';
import { usePlanInput } from './usePlanInput';

const ICON: Record<PlanKind, LucideIcon> = { review: Layers, test: ClipboardCheck, practice: Dumbbell, grammar: BookOpenCheck, writing: PenLine, lesson: Headphones };
const LANG = { en: 'English', zh: '中文' } as const;
/** Same colours as the areas of the app: reviews are Words (violet), lessons are Lessons (teal)… */
const KIND_TONE: Record<PlanKind, Tone> = { review: 'violet', test: 'sky', practice: 'amber', grammar: 'amber', writing: 'rose', lesson: 'teal' };

/** Today's plan on the dashboard: built once a day, ticked off by what you actually do. */
export function TodayPlan() {
  const progress = usePlanProgress();
  const today = progress.data?.today;
  const stored = useStoredPlans(today);
  const plan = stored.data?.find((p) => p.day === today);
  const skips = useMemo(() => (stored.data ? countSkips(stored.data.filter((p) => p.day !== today)) : undefined), [stored.data, today]);
  // only gather inputs when there is no plan for today yet
  const input = usePlanInput(stored.data && !plan ? today : undefined, skips);
  const save = useSavePlan();
  const building = useRef<string | null>(null);

  useEffect(() => {
    // a stored plan clears the guard, so a rebuilt (deleted) plan is made again
    if (plan) {
      building.current = null;
      return;
    }
    if (!input || building.current === input.today) return;
    building.current = input.today;
    save.mutate({ day: input.today, plan: buildPlan(input) }, { onError: (e) => toast.error(toUserMessage(e)) });
  }, [input, plan, save]);

  if (progress.isError || stored.isError) {
    return <ErrorState error={progress.error ?? stored.error} onRetry={() => (progress.refetch(), stored.refetch())} title="Could not load today's plan" />;
  }
  if (!plan) return <Skeleton className="h-56" data-testid="plan-loading" />;
  return <PlanCard plan={plan} progress={progress.data!} />;
}

function PlanCard({ plan, progress }: { plan: StoredPlan; progress: TodayProgress }) {
  const { lang } = useStudyLanguage();
  // only what belongs to the language being studied (items without a language, like habits, always)
  const items = plan.items.filter((i) => !i.language || i.language === lang);
  const setStatus = useSetItemStatus();
  const rebuild = useRebuildPlan();
  const state = (i: PlanItem) => {
    const s = plan.status[i.key];
    const p = itemProgress(i, progress);
    return { p, done: s === 'done' || p >= 1, skipped: s === 'skipped' && p < 1 };
  };
  const doneCount = items.filter((i) => state(i).done).length;
  const minutes = items.reduce((n, i) => n + i.minutes, 0);
  const mark = (key: string, status: 'done' | 'skipped' | null) =>
    setStatus.mutate({ day: plan.day, key, status }, { onError: (e) => toast.error(toUserMessage(e)) });

  const next = items.find((i) => !state(i).done && !state(i).skipped);
  const pct = items.length ? (doneCount / items.length) * 100 : 0;

  return (
    <Card data-testid="today-plan" className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            Today's plan
            {plan.restDay && <Badge variant="secondary">Rest day</Badge>}
          </CardTitle>
          <CardDescription data-testid="plan-summary">
            {items.length ? `${doneCount} of ${items.length} done · about ${minutes} min` : 'Nothing planned today.'}
          </CardDescription>
          {items.length > 0 && <Progress value={pct} className="h-2 w-48 max-w-full" label="Plan progress" />}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={rebuild.isPending}
          title="Make a new plan from your latest data (clears today's skips)"
          onClick={() => rebuild.mutate(plan.day, { onError: (e) => toast.error(toUserMessage(e)) })}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Rebuild
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 && (
          <ol className="space-y-2.5">
            {items.map((item) => {
              const s = state(item);
              const Icon = s.done ? Check : ICON[item.kind];
              const auto = item.target.type !== 'manual';
              const isNext = item === next;
              const tone = TONE[KIND_TONE[item.kind]];
              return (
                <li
                  key={item.key}
                  className={cn(
                    'flex gap-3 rounded-xl border p-3 transition-colors sm:gap-4 sm:p-4',
                    isNext && `${tone.soft} border-transparent ring-2 ${tone.ring}`,
                    (s.done || s.skipped) && 'bg-muted/50',
                  )}
                  data-plan-item={item.key}
                  data-state={s.done ? 'done' : s.skipped ? 'skipped' : 'todo'}
                >
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', s.done ? 'bg-success/15 text-success' : tone.tile)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    {isNext && <p className={cn('text-xs font-semibold uppercase tracking-wide', tone.text)}>Up next</p>}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn('font-semibold', s.skipped && 'text-muted-foreground line-through', s.done && 'text-muted-foreground')}>{item.title}</p>
                      {item.language && <Badge variant="outline">{LANG[item.language]}</Badge>}
                      <span className="text-xs text-muted-foreground">{item.minutes} min</span>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="plan-reason">
                      {item.reason}
                    </p>
                    {item.detail && (
                      <p className="rounded-lg bg-card/80 px-2.5 py-1.5 text-sm ring-1 ring-border" lang={item.kind === 'grammar' ? 'vi' : undefined}>
                        {item.detail}
                      </p>
                    )}
                    {auto && !s.done && s.p > 0 && <Progress value={s.p * 100} className="h-1.5 max-w-xs" label={`${item.title} progress`} />}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                    {s.done ? (
                      <span className="text-sm font-semibold text-success">Done</span>
                    ) : s.skipped ? (
                      <Button variant="ghost" size="sm" onClick={() => mark(item.key, null)}>
                        Undo
                      </Button>
                    ) : (
                      <>
                        <Button asChild size={isNext ? 'default' : 'sm'} variant={isNext ? 'default' : 'outline'} className={isNext ? `${tone.solid} shadow-none hover:opacity-90` : undefined}>
                          <Link to={item.href}>Start</Link>
                        </Button>
                        {!auto && (
                          <Button variant="outline" size="sm" onClick={() => mark(item.key, 'done')}>
                            Mark done
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => mark(item.key, 'skipped')} aria-label={`Skip: ${item.title}`}>
                          Skip
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {items.length > 0 && !next && (
          <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">🎉 All done for today — great work. Anything extra is a bonus.</p>
        )}
        {plan.notes.length > 0 && (
          <ul className="space-y-1.5 text-sm text-muted-foreground" data-testid="plan-notes">
            {plan.notes.map((n) => (
              <li key={n} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                💡 {n}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
