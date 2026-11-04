import { ArrowRight, BookOpen, CalendarCheck, Clock, Compass, Flame, Layers, PlayCircle, Shapes, Target, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary, useDueToday } from '@/features/dashboard/api';
import { StatCard } from '@/features/dashboard/StatCard';
import { useProgressMap } from '@/features/library/api';
import { useProfile } from '@/features/profile/api';
import { GoalsPanel } from '@/features/learner/GoalsPanel';
import { formatStudyTime, useDailyActivity, useLearningStats, type StatsLanguage } from '@/features/stats/api';
import { StudyTimeChart } from '@/features/stats/charts';
import { LanguageSwitch } from '@/features/stats/LanguageSwitch';
import { useStatsLanguage } from '@/features/stats/useStatsLanguage';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The lesson studied most recently that isn't finished yet. */
function useContinueLesson() {
  const progress = useProgressMap();
  const last = [...(progress.data?.values() ?? [])].filter((p) => p.status === 'in_progress').sort((a, b) => (b.last_studied_at ?? '').localeCompare(a.last_studied_at ?? ''))[0];
  return useQuery({
    queryKey: ['continue-lesson', last?.lesson_id],
    enabled: Boolean(last?.lesson_id),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('lesson_catalog').select('id, title, language, sentence_count').eq('id', last!.lesson_id!).maybeSingle();
      if (error) throw error;
      return data ? { ...data, done: last!.finished_sentences ?? 0 } : null;
    },
  });
}

function LanguageCard({ language }: { language: 'en' | 'zh' }) {
  const stats = useLearningStats(language, 30);
  const s = stats.data;
  return (
    <Card className="p-4">
      <p className="font-semibold">{language === 'en' ? 'English' : '中文 Chinese'}</p>
      {!s ? (
        <Skeleton className="mt-3 h-14" />
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Study time (30d)</dt>
          <dd className="text-right font-medium tabular-nums">{formatStudyTime(s.period_seconds)}</dd>
          <dt className="text-muted-foreground">Accuracy (30d)</dt>
          <dd className="text-right font-medium tabular-nums">{s.avg_accuracy === null ? '—' : `${s.avg_accuracy}%`}</dd>
          <dt className="text-muted-foreground">Words saved</dt>
          <dd className="text-right font-medium tabular-nums">{s.words}</dd>
          <dt className="text-muted-foreground">Lessons completed</dt>
          <dd className="text-right font-medium tabular-nums">{s.lessons_completed}</dd>
        </dl>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const profile = useProfile();
  const summary = useDashboardSummary();
  const [lang, setLang] = useStatsLanguage();
  const [days, setDays] = useState<7 | 30>(7);
  const stats = useLearningStats(lang, 30);
  const activity = useDailyActivity(lang, days);
  const today = useDailyActivity(undefined, 1);
  const due = useDueToday();
  const cont = useContinueLesson();
  const s = stats.data;
  const goal = profile.data?.daily_goal_minutes ?? 15;
  const todayMinutes = Math.floor((today.data?.[0]?.minutes ?? 0));

  return (
    <>
      <PageHeader
        title={profile.data ? `${greeting(new Date().getHours())}, ${profile.data.display_name}` : 'Dashboard'}
        description={
          <span className="flex items-center gap-3">
            <span data-testid="goal">
              Today: {todayMinutes} / {goal} min
            </span>
            <Progress value={(todayMinutes / goal) * 100} className="w-32" label="Daily goal progress" />
            {todayMinutes >= goal && <span className="text-success">Goal reached 🎉</span>}
          </span>
        }
        actions={<LanguageSwitch value={lang} onChange={setLang as (l: StatsLanguage) => void} />}
      />

      {stats.isError || summary.isError ? (
        <ErrorState error={stats.error ?? summary.error} onRetry={() => (stats.refetch(), summary.refetch())} title="Could not load your stats" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6" data-testid="stat-tiles">
          <StatCard label="Learning streak" icon={Flame} loading={summary.isPending} value={summary.data ? `${summary.data.streak} ${summary.data.streak === 1 ? 'day' : 'days'}` : ''} />
          <StatCard label="Study time" icon={Clock} loading={!s} value={s ? formatStudyTime(s.total_seconds) : ''} hint="all time" />
          <StatCard label="Listening accuracy" icon={Target} loading={!s} value={s?.avg_accuracy == null ? '—' : `${s.avg_accuracy}%`} hint="last 30 days" />
          <StatCard label="Words saved" icon={BookOpen} loading={!s} value={s?.words ?? 0} />
          <StatCard label="Due for review" icon={CalendarCheck} loading={due === undefined} value={due ?? 0} />
          <StatCard label="Lessons completed" icon={Trophy} loading={!s} value={s?.lessons_completed ?? 0} />
        </div>
      )}

      <div className="mt-6">
        <GoalsPanel />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Study time</CardTitle>
            <div className="flex gap-1" role="group" aria-label="Range">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={cn('rounded px-2 py-1 text-xs font-medium', days === d ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {d} days
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>{activity.data ? <StudyTimeChart data={activity.data} /> : <Skeleton className="h-52" />}</CardContent>
        </Card>

        <div className="space-y-4">
          {cont.data && (
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Continue learning</p>
              <p className="mt-1 font-semibold" lang={cont.data.language === 'zh' ? 'zh' : undefined}>
                {cont.data.title?.split(' · ')[0]}
              </p>
              <Progress className="mt-2" value={((cont.data.done ?? 0) / Math.max(1, cont.data.sentence_count ?? 1)) * 100} label="Lesson progress" />
              <p className="mt-1 text-xs text-muted-foreground">
                {cont.data.done} / {cont.data.sentence_count} sentences
              </p>
              <Button size="sm" className="mt-3 w-full" asChild>
                <Link to={`/lessons/${cont.data.id}/practice`}>
                  <PlayCircle /> Continue
                </Link>
              </Button>
            </Card>
          )}
          <Card className="divide-y">
            {[
              { to: '/review', icon: Layers, label: 'Review flashcards', extra: due ? `${due} due` : undefined },
              { to: '/lessons', icon: Compass, label: 'Explore lessons' },
              { to: '/word-forms', icon: Shapes, label: 'Word forms practice' },
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
          <h2 className="mb-3 text-base font-semibold">English vs Chinese</h2>
          <div className="grid gap-4 sm:grid-cols-2" data-testid="language-split">
            <LanguageCard language="en" />
            <LanguageCard language="zh" />
          </div>
        </div>
      )}
    </>
  );
}
