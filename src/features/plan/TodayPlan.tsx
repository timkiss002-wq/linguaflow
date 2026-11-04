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
import { cn } from '@/lib/utils';
import { usePlanProgress, useRebuildPlan, useSavePlan, useSetItemStatus, useStoredPlans, type StoredPlan } from './api';
import { usePlanInput } from './usePlanInput';

const ICON: Record<PlanKind, LucideIcon> = { review: Layers, test: ClipboardCheck, practice: Dumbbell, grammar: BookOpenCheck, writing: PenLine, lesson: Headphones };
const LANG = { en: 'English', zh: '中文' } as const;

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
  const setStatus = useSetItemStatus();
  const rebuild = useRebuildPlan();
  const state = (i: PlanItem) => {
    const s = plan.status[i.key];
    const p = itemProgress(i, progress);
    return { p, done: s === 'done' || p >= 1, skipped: s === 'skipped' && p < 1 };
  };
  const doneCount = plan.items.filter((i) => state(i).done).length;
  const minutes = plan.items.reduce((n, i) => n + i.minutes, 0);
  const mark = (key: string, status: 'done' | 'skipped' | null) =>
    setStatus.mutate({ day: plan.day, key, status }, { onError: (e) => toast.error(toUserMessage(e)) });

  return (
    <Card data-testid="today-plan">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            Today's plan
            {plan.restDay && <Badge variant="secondary">Rest day</Badge>}
          </CardTitle>
          <CardDescription data-testid="plan-summary">
            {plan.items.length ? `${doneCount} of ${plan.items.length} done · about ${minutes} min` : 'Nothing planned today.'}
          </CardDescription>
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
        {plan.items.length > 0 && (
          <ol className="divide-y rounded-md border">
            {plan.items.map((item) => {
              const s = state(item);
              const Icon = s.done ? Check : ICON[item.kind];
              const auto = item.target.type !== 'manual';
              return (
                <li key={item.key} className={cn('flex gap-3 p-3', (s.done || s.skipped) && 'bg-muted/40')} data-plan-item={item.key} data-state={s.done ? 'done' : s.skipped ? 'skipped' : 'todo'}>
                  <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', s.done ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary')}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn('font-medium', s.skipped && 'text-muted-foreground line-through')}>{item.title}</p>
                      {item.language && <Badge variant="outline">{LANG[item.language]}</Badge>}
                      <span className="text-xs text-muted-foreground">{item.minutes} min</span>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="plan-reason">
                      {item.reason}
                    </p>
                    {item.detail && (
                      <p className="rounded bg-muted/60 px-2 py-1 text-sm" lang={item.kind === 'grammar' ? 'vi' : undefined}>
                        {item.detail}
                      </p>
                    )}
                    {auto && !s.done && s.p > 0 && <Progress value={s.p * 100} className="h-1.5 max-w-xs" label={`${item.title} progress`} />}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
                    {s.done ? (
                      <span className="text-sm font-medium text-success">Done</span>
                    ) : s.skipped ? (
                      <Button variant="ghost" size="sm" onClick={() => mark(item.key, null)}>
                        Undo
                      </Button>
                    ) : (
                      <>
                        <Button asChild size="sm">
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
        {plan.notes.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground" data-testid="plan-notes">
            {plan.notes.map((n) => (
              <li key={n}>💡 {n}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
