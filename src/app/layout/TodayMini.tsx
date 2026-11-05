import { Flame } from 'lucide-react';
import { useDashboardSummary } from '@/features/dashboard/api';
import { useProfile } from '@/features/profile/api';
import { useDailyActivity } from '@/features/stats/api';

/** Small "today" card in the menu: streak and minutes towards the daily goal, always in view. */
export function TodayMini() {
  const summary = useDashboardSummary();
  const today = useDailyActivity(undefined, 1);
  const goal = useProfile().data?.daily_goal_minutes ?? 15;
  const minutes = Math.floor(today.data?.[0]?.minutes ?? 0);
  const pct = Math.min(100, (minutes / goal) * 100);
  const streak = summary.data?.streak ?? 0;
  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-3 ring-1 ring-orange-100 dark:from-orange-500/10 dark:to-amber-500/5 dark:ring-orange-500/20" data-testid="today-mini">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-orange-700 dark:text-orange-300">
          <Flame className="size-4" aria-hidden /> {streak} day{streak === 1 ? '' : 's'}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {minutes}/{goal} min
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-orange-100 dark:bg-orange-500/20" role="progressbar" aria-label="Today's goal" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
