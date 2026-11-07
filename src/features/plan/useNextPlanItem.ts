import { useStudyLanguage } from '@/features/study/context';
import { itemProgress, type PlanItem } from '@/lib/personal/plan';
import { usePlanProgress, useStoredPlans } from './api';

/**
 * The next thing to do in today's plan (same rule as the plan card: first item not done and not skipped,
 * in the language being studied). undefined while loading, null when everything is done, 'error' if it can't load.
 */
export function useNextPlanItem(): PlanItem | null | undefined | 'error' {
  const { lang } = useStudyLanguage();
  const progress = usePlanProgress();
  const today = progress.data?.today;
  const stored = useStoredPlans(today);
  const plan = stored.data?.find((p) => p.day === today);
  if (progress.isError || stored.isError) return 'error';
  if (!plan || !progress.data) return undefined;
  return (
    plan.items.filter((i) => !i.language || i.language === lang).find((i) => {
      const s = plan.status[i.key];
      const p = itemProgress(i, progress.data);
      return !(s === 'done' || p >= 1) && !(s === 'skipped' && p < 1);
    }) ?? null
  );
}
