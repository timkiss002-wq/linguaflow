import { ArrowRight, BookOpen, CalendarCheck, Clock, Compass, Flame, Layers, PlayCircle, Shapes } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary, useDueToday } from '@/features/dashboard/api';
import { StatCard } from '@/features/dashboard/StatCard';
import { useProgressMap } from '@/features/library/api';
import { useProfile } from '@/features/profile/api';
import { GoalsPanel } from '@/features/learner/GoalsPanel';
import { TodayPlan } from '@/features/plan/TodayPlan';
import { useNextPlanItem } from '@/features/plan/useNextPlanItem';
import { formatStudyTime, useDailyActivity, useLearningStats } from '@/features/stats/api';
import { StudyTimeChart } from '@/features/stats/charts';
import { useStatsLanguage } from '@/features/stats/useStatsLanguage';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useStudyLanguage } from '@/features/study/context';
import { getSupabase } from '@/lib/supabase';
import TodayPage from '@/pages/TodayPage';

function greeting(hour: number) {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/** The lesson studied most recently that isn't finished yet. */
function useContinueLesson(lang: 'en' | 'zh') {
  const progress = useProgressMap();
  const open = [...(progress.data?.values() ?? [])].filter((p) => p.status === 'in_progress').sort((a, b) => (b.last_studied_at ?? '').localeCompare(a.last_studied_at ?? ''));
  const ids = open.map((p) => p.lesson_id!).slice(0, 50);
  return useQuery({
    queryKey: ['continue-lesson', lang, ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      // most recent unfinished lesson in the language being studied
      const { data, error } = await getSupabase().from('lesson_catalog').select('id, title, language, sentence_count').in('id', ids).eq('language', lang);
      if (error) throw error;
      const p = open.find((x) => data.some((l) => l.id === x.lesson_id));
      const lesson = p && data.find((l) => l.id === p.lesson_id);
      return lesson ? { ...lesson, done: p!.finished_sentences ?? 0 } : null;
    },
  });
}

/** Circular progress towards today's minutes goal. */
function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(1, value / Math.max(1, goal));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="size-14 -rotate-90" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
    </svg>
  );
}

function LanguageCard({ language }: { language: 'en' | 'zh' }) {
  const stats = useLearningStats(language, 30);
  const s = stats.data;
  return (
    <Card className="p-4">
      <p className="font-semibold">{language === 'en' ? 'Tiếng Anh' : 'Tiếng Trung 中文'}</p>
      {!s ? (
        <Skeleton className="mt-3 h-14" />
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Thời gian học (30 ngày)</dt>
          <dd className="text-right font-medium tabular-nums">{formatStudyTime(s.period_seconds)}</dd>
          <dt className="text-muted-foreground">Độ chính xác (30 ngày)</dt>
          <dd className="text-right font-medium tabular-nums">{s.avg_accuracy === null ? '—' : `${s.avg_accuracy}%`}</dd>
          <dt className="text-muted-foreground">Từ đã lưu</dt>
          <dd className="text-right font-medium tabular-nums">{s.words}</dd>
          <dt className="text-muted-foreground">Bài đã xong</dt>
          <dd className="text-right font-medium tabular-nums">{s.lessons_completed}</dd>
        </dl>
      )}
    </Card>
  );
}

/** English opens on "Hôm nay" (today's three tasks); Chinese keeps the stats dashboard. */
export default function DashboardPage() {
  const { lang } = useStudyLanguage();
  return lang === 'en' ? <TodayPage /> : <ClassicDashboard />;
}

function ClassicDashboard() {
  const profile = useProfile();
  const summary = useDashboardSummary();
  const [lang] = useStatsLanguage();
  const { lang: studying } = useStudyLanguage();
  const [days, setDays] = useState<7 | 30>(7);
  const stats = useLearningStats(lang, 30);
  const activity = useDailyActivity(lang, days);
  const today = useDailyActivity(undefined, 1);
  const due = useDueToday();
  const next = useNextPlanItem();
  const cont = useContinueLesson(lang ?? 'en');
  const s = stats.data;
  const goal = profile.data?.daily_goal_minutes ?? 15;
  const todayMinutes = Math.floor(today.data?.[0]?.minutes ?? 0);
  const streak = summary.data?.streak ?? 0;

  // Each number appears once: streak and today's minutes live in the hero (the header chip is hidden on this page),
  // the language being studied lives in the header switch.
  return (
    <>
      <section className="mb-6 flex flex-col gap-5 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{profile.data ? `${greeting(new Date().getHours())}, ${profile.data.display_name}` : 'Trang chủ'}</h1>
          <div className="mt-4">
            {next === 'error' ? null : next === undefined ? (
              <Skeleton className="h-11 w-72" />
            ) : next ? (
              <Button asChild size="lg" className="max-w-full" data-testid="hero-next">
                <Link to={next.href}>
                  <PlayCircle className="size-5" />
                  <span className="truncate">Tiếp tục: {next.title}</span>
                </Link>
              </Button>
            ) : (
              <p className="font-medium" data-testid="hero-next">
                Xong kế hoạch hôm nay 🎉 — học thêm là thưởng.
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 rounded-lg bg-muted px-4 py-3">
          <GoalRing value={todayMinutes} goal={goal} />
          <div className="text-sm">
            <p className="text-lg font-bold tabular-nums" data-testid="goal">
              {todayMinutes} / {goal} phút
            </p>
            <p className="text-muted-foreground">{todayMinutes >= goal ? 'Đạt mục tiêu hôm nay 🎉' : `còn ${goal - todayMinutes} phút`}</p>
            <p className="mt-1 flex items-center gap-1 font-semibold" data-testid="streak" title="Số ngày học liên tiếp">
              <Flame className="size-4" aria-hidden /> {summary.isPending ? '…' : `Chuỗi ${streak} ngày`}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-6">
        <TodayPlan />
      </div>

      {stats.isError || summary.isError ? (
        <ErrorState error={stats.error ?? summary.error} onRetry={() => (stats.refetch(), summary.refetch())} title="Không tải được số liệu" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" data-testid="stat-tiles">
          <StatCard label="Thời gian học" icon={Clock} loading={!s} value={s ? formatStudyTime(s.total_seconds) : ''} hint="từ trước tới nay" />
          <StatCard label="Từ đã lưu" icon={BookOpen} loading={!s} value={s?.words ?? 0} />
          <StatCard label="Thẻ cần ôn hôm nay" icon={CalendarCheck} loading={due === undefined} value={due ?? 0} />
        </div>
      )}
      <p className="mt-2 text-right text-xs">
        <Link to="/statistics" className="text-primary hover:underline">
          Xem đủ thống kê (độ chính xác, bài đã xong…) →
        </Link>
      </p>

      <div className="mt-6">
        <GoalsPanel />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Thời gian học</CardTitle>
            <div className="flex gap-1" role="group" aria-label="Khoảng thời gian">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={cn('rounded px-2 py-1 text-xs font-medium', days === d ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>{activity.data ? <StudyTimeChart data={activity.data} /> : <Skeleton className="h-52" />}</CardContent>
        </Card>

        <div className="space-y-4">
          {cont.data && (
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Học tiếp bài nghe</p>
              <p className="mt-1 font-semibold" lang={cont.data.language === 'zh' ? 'zh' : undefined}>
                {cont.data.title?.split(' · ')[0]}
              </p>
              <Progress className="mt-2" value={((cont.data.done ?? 0) / Math.max(1, cont.data.sentence_count ?? 1)) * 100} label="Tiến độ bài" />
              <p className="mt-1 text-xs text-muted-foreground">
                {cont.data.done} / {cont.data.sentence_count} câu
              </p>
              <Button size="sm" className="mt-3 w-full" asChild>
                <Link to={`/lessons/${cont.data.id}/practice`}>
                  <PlayCircle /> Học tiếp
                </Link>
              </Button>
            </Card>
          )}
          <Card className="divide-y">
            {[
              { to: '/review', icon: Layers, label: 'Ôn thẻ từ', extra: due ? `${due} thẻ` : undefined },
              { to: '/lessons', icon: Compass, label: 'Kho bài nghe' },
              // English only: shown only while studying English, so it never switches the app's language silently
              ...(studying === 'en' ? [{ to: '/word-forms', icon: Shapes, label: 'Luyện dạng từ' }] : []),
            ].map(({ to, icon: Icon, label, extra }) => (
              <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted">
                <Icon className="size-4 text-primary" />
                <span className="flex-1 font-medium">{label}</span>
                {extra && <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{extra}</span>}
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        </div>
      </div>

      {!lang && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Tiếng Anh và tiếng Trung</h2>
          <div className="grid gap-4 sm:grid-cols-2" data-testid="language-split">
            <LanguageCard language="en" />
            <LanguageCard language="zh" />
          </div>
        </div>
      )}
    </>
  );
}
