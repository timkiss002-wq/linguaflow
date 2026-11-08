import { Flame } from 'lucide-react';
import { useDashboardSummary } from '@/features/dashboard/api';
import { useProfile } from '@/features/profile/api';
import { useDailyActivity } from '@/features/stats/api';

/** Compact version for the top bar: streak and today's minutes in one pill. */
export function TodayChip() {
  const summary = useDashboardSummary();
  const today = useDailyActivity(undefined, 1);
  const goal = useProfile().data?.daily_goal_minutes ?? 15;
  const minutes = Math.floor(today.data?.[0]?.minutes ?? 0);
  const streak = summary.data?.streak ?? 0;
  const done = minutes >= goal;
  return (
    <span
      className="flex h-8 items-center gap-2 rounded-full border bg-card px-3 text-xs"
      data-testid="today-mini"
      title={`Chuỗi ${streak} ngày · hôm nay ${minutes}/${goal} phút`}
    >
      <span className="flex items-center gap-1 font-semibold">
        <Flame className="size-3.5 text-orange-500" aria-hidden /> {streak}
      </span>
      <span className={done ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground tabular-nums'}>
        {minutes}/{goal} phút
      </span>
    </span>
  );
}
