import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLevelOverview, type ReviewRow } from '@/features/assessment/api';
import { useUser } from '@/features/auth/useAuth';
import { useDueByLanguage } from '@/features/dashboard/api';
import { useInsightData } from '@/features/insights/api';
import { useLearner } from '@/features/learner/api';
import { toGoal } from '@/features/learner/useRecommendations';
import { useProgressMap } from '@/features/library/api';
import { useProfile } from '@/features/profile/api';
import { useWordFamilyIndex } from '@/features/wordforms/api';
import { useSubmissions } from '@/features/writing/api';
import { EXAMS, recommendLessons, type Goal } from '@/lib/personal/goals';
import { buildInsights } from '@/lib/personal/insights';
import { checkinDue, levelLabel, ratingToLevel } from '@/lib/personal/levels';
import type { Lang, LessonPick, PlanInput, PlanKind } from '@/lib/personal/plan';
import { getSupabase } from '@/lib/supabase';

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Gathers everything the plan needs. Returns undefined until all of it has loaded; a part that fails to load
 * (e.g. the insights) is left out rather than blocking the plan.
 */
export function usePlanInput(today: string | undefined, skips: Partial<Record<PlanKind, number>> | undefined): PlanInput | undefined {
  const user = useUser();
  const profile = useProfile();
  const learner = useLearner();
  const due = useDueByLanguage();
  const overview = useLevelOverview();
  const insightData = useInsightData(60);
  const index = useWordFamilyIndex();
  const progress = useProgressMap();
  const writings = useSubmissions();
  const lessons = useQuery({
    queryKey: ['all-lessons', user.id],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('lesson_catalog').select('*').eq('is_published', true);
      if (error) throw error;
      return data;
    },
  });

  const goals = learner.data?.goals ?? [];
  const finished = (lang: Lang) => overview.data?.tests.filter((t) => t.language === lang && t.finished_at) ?? [];
  // grammar points missed in the latest finished test of each goal language
  const latest = goals.flatMap((g) => {
    const id = finished(g.language)[0]?.id;
    return id ? [{ language: g.language, id }] : [];
  });
  const reviews = useQueries({
    queries: latest.map(({ id }) => ({
      queryKey: ['level-test', 'review', id],
      queryFn: async () => {
        const { data, error } = await getSupabase().rpc('get_assessment_review', { p_assessment: id });
        if (error) throw error;
        return data as unknown as { responses: ReviewRow[] } | null;
      },
    })),
  });

  const settled = (q: { isPending: boolean; isError: boolean }) => !q.isPending || q.isError;
  // after "Rebuild" the cached data is refetched: wait for the fresh values
  const fetching = [profile, learner, overview, insightData, progress, lessons, writings].some((q) => q.isFetching);
  const ready =
    !fetching &&
    today &&
    skips &&
    profile.data &&
    learner.data &&
    due !== undefined &&
    overview.data &&
    lessons.data &&
    progress.data &&
    settled(writings) &&
    settled(insightData) &&
    reviews.every(settled);

  return useMemo(() => {
    if (!ready) return undefined;
    const lp = learner.data!.profile;
    const habitAnalysis = lp?.habit_analysis ?? true;
    const insights = insightData.data
      ? buildInsights(insightData.data, { sameFamily: index?.sameFamily, habitAnalysis, plannedDays: lp?.study_days.length ?? 7 })
      : [];

    const tests: PlanInput['tests'] = {};
    const levelSource: PlanInput['levelSource'] = {};
    const picks: PlanInput['lessons'] = {};
    const completed = new Set([...progress.data!.values()].filter((p) => p.status === 'completed').map((p) => p.lesson_id!));

    for (const g of goals) {
      const lang = g.language;
      const all = overview.data!.tests.filter((t) => t.language === lang);
      const open = all.find((t) => !t.finished_at);
      const last = finished(lang)[0];
      tests[lang] = open ? { state: 'open', openId: open.id } : !last ? { state: 'none' } : checkinDue(last.finished_at) ? { state: 'due' } : { state: 'ok' };

      // lesson level: listening level from the test (kept up to date by dictation), else the profile goal
      let goal: Goal = toGoal(g);
      const listening = last ? overview.data!.ratings.find((r) => r.language === lang && r.skill === 'listening') : undefined;
      if (listening) {
        const level = Math.max(1, ratingToLevel(listening.rating));
        goal = lang === 'zh' ? { ...goal, exam: 'hsk2', current_level: String(level) } : { ...goal, exam: 'cefr', current_level: CEFR[level - 1]! };
        levelSource[lang] = `your listening level is ${levelLabel(lang, level)} (level test + dictation)`;
      } else {
        levelSource[lang] = `your level from your profile: ${EXAMS[goal.exam].describe(goal.current_level)}`;
      }

      const started = [...progress.data!.values()]
        .filter((p) => p.status === 'in_progress')
        .map((p) => ({ p, l: lessons.data!.find((l) => l.id === p.lesson_id && l.language === lang) }))
        .filter((x) => x.l && (x.l.sentence_count ?? 0) > (x.p.finished_sentences ?? 0))
        .sort((a, b) => (b.p.last_studied_at ?? '').localeCompare(a.p.last_studied_at ?? ''))[0];
      if (started) {
        const l = started.l!;
        picks[lang] = { id: l.id!, title: l.title!, language: lang, remaining: (l.sentence_count ?? 0) - (started.p.finished_sentences ?? 0), continue: true, reasons: [] } satisfies LessonPick;
      } else {
        const rec = recommendLessons(lessons.data!, goal, lp?.interests ?? [], completed, 1)[0];
        if (rec) picks[lang] = { id: rec.lesson.id!, title: rec.lesson.title!, language: lang, remaining: rec.lesson.sentence_count ?? 0, continue: false, reasons: rec.reasons };
      }
    }

    const missedPoints = reviews.flatMap((q, i) => {
      const { language, id: testId } = latest[i]!;
      const seen = new Set<string>();
      return (q.data?.responses ?? [])
        .filter((r) => !r.correct && r.point && !seen.has(r.point) && seen.add(r.point))
        .map((r) => ({ language, code: r.point!, name: r.point_name ?? r.point!, vi: r.point_vi ?? '', testId }));
    });

    return {
      today: today!,
      goalMinutes: profile.data!.daily_goal_minutes,
      studyDays: lp?.study_days ?? [0, 1, 2, 3, 4, 5, 6],
      dueCards: due!.en + due!.zh,
      dueLanguage: due!.zh > due!.en ? 'zh' : 'en',
      goals: goals.map((g) => ({ language: g.language, examDate: g.exam_date })),
      tests,
      insights,
      missedPoints,
      lessons: picks,
      levelSource,
      skips: skips!,
      writingsLast7: (writings.data ?? []).filter((w) => Date.parse(w.created_at) > Date.now() - 7 * 86_400_000).length,
      avgSessionMinutes: habitAnalysis ? (insightData.data?.habits.avg_session_minutes ?? null) : null,
    } satisfies PlanInput;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, today, skips, profile.data, learner.data, due, overview.data, lessons.data, progress.data, insightData.data, writings.data, index, reviews.map((r) => r.dataUpdatedAt).join()]);
}
