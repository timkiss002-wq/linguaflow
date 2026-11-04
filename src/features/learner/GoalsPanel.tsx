import { CalendarDays, Pencil, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProfile } from '@/features/profile/api';
import { daysUntil, EXAMS, hskWordPlan, SKILLS, type Goal } from '@/lib/personal/goals';
import { useHskCoverage, useLearner } from './api';
import { RecommendedList } from './RecommendedLessons';
import { toGoal, useRecommendations } from './useRecommendations';

function HskProgress({ goal }: { goal: Goal }) {
  const coverage = useHskCoverage(goal.exam === 'hsk2' ? 2 : 3);
  const plan = coverage.data ? hskWordPlan(goal, coverage.data) : null;
  if (!plan) return null;
  return (
    <div className="space-y-1.5" data-testid="hsk-plan">
      <div className="flex justify-between text-sm">
        <span>
          HSK {goal.target_level} words you know
        </span>
        <span className="tabular-nums text-muted-foreground">
          {plan.known} / {plan.total}
        </span>
      </div>
      <Progress value={(plan.known / plan.total) * 100} label={`HSK ${goal.target_level} vocabulary known`} />
      <p className="text-xs text-muted-foreground">
        {plan.saved} saved in your notebook ({plan.known} in review or mastered).{' '}
        {plan.perDay !== null ? (
          <>
            <strong className="text-foreground">Learn about {plan.perDay} new HSK words a day to be ready by the exam</strong>{' '}
            <span data-testid="pace" className={plan.perDay > 20 ? 'text-warning' : plan.perDay > 10 ? 'text-foreground' : 'text-success'}>
              ({plan.perDay > 20 ? 'very ambitious — consider a later date or more daily time' : plan.perDay > 10 ? 'challenging' : 'comfortable'}).
            </span>
          </>
        ) : (
          `${plan.remaining} words to go.`
        )}
      </p>
    </div>
  );
}

function GoalCard({ goal, dailyMinutes, recommended }: { goal: Goal; dailyMinutes: number; recommended?: Parameters<typeof RecommendedList>[0]['items'] }) {
  const exam = EXAMS[goal.exam];
  const days = daysUntil(goal.exam_date);
  return (
    <Card className="space-y-4 p-5" data-testid={`goal-card-${goal.language}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{goal.language === 'en' ? 'English' : '中文 Chinese'} · {exam.label}</p>
          <p className="mt-1 text-lg font-semibold">
            {exam.describe(goal.current_level)} → {exam.describe(goal.target_level)}
          </p>
        </div>
        <Target className="size-5 text-primary" />
      </div>
      {days !== null && (
        <p className="flex items-center gap-1.5 text-sm" data-testid="countdown">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span>
            <strong>{days}</strong> {days === 1 ? 'day' : 'days'} until {new Date(`${goal.exam_date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {goal.exam !== 'hsk2' && goal.exam !== 'hsk3' && (
              <span className="text-muted-foreground"> · about {Math.round((days * dailyMinutes) / 60)} hours of study at {dailyMinutes} min/day</span>
            )}
          </span>
        </p>
      )}
      {(goal.exam === 'hsk2' || goal.exam === 'hsk3') && <HskProgress goal={goal} />}
      {goal.focus_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {goal.focus_skills.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {SKILLS.find((x) => x.value === s)?.label ?? s}
            </span>
          ))}
        </div>
      )}
      {recommended && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Next lessons for you</p>
          <RecommendedList items={recommended} />
        </div>
      )}
    </Card>
  );
}

/** Dashboard: the learner's goals with progress and recommended lessons — or a prompt to set them. */
export function GoalsPanel() {
  const learner = useLearner();
  const profile = useProfile();
  const recs = useRecommendations();
  if (!learner.data) return null;
  if (!learner.data.profile?.onboarded_at || learner.data.goals.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="setup-profile">
        <div>
          <p className="font-semibold">Set up your learning profile</p>
          <p className="text-sm text-muted-foreground">Tell us your goal (IELTS, HSK…), level and interests — lessons and practice will be picked for you.</p>
        </div>
        <Button asChild>
          <Link to="/onboarding">Set up (2 min)</Link>
        </Button>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Your goals</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/onboarding">
            <Pencil /> Edit
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {learner.data.goals.map((g) => (
          <GoalCard key={g.id} goal={toGoal(g)} dailyMinutes={profile.data?.daily_goal_minutes ?? 15} recommended={recs?.find((r) => r.language === g.language)?.items} />
        ))}
      </div>
    </div>
  );
}
