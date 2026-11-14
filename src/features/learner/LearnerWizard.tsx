import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toUserMessage } from '@/lib/errors';
import { INTERESTS, validateGoal, type Goal, type Language } from '@/lib/personal/goals';
import { cn } from '@/lib/utils';
import { useSaveLearner, type LearnerData } from './api';
import { Chip } from './Chip';
import { GoalEditor } from './GoalEditor';

const STEPS = ['Languages', 'Goals', 'Interests', 'Time & habits'] as const;
const MINUTES = [5, 10, 15, 20, 30, 45, 60];
const TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Late night' },
] as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultGoal = (language: Language): Goal =>
  language === 'en'
    ? { language, exam: 'ielts', current_level: '5.0', target_level: '6.5', exam_date: null, focus_skills: ['listening', 'vocabulary'] }
    : { language, exam: 'hsk3', current_level: '2', target_level: '4', exam_date: null, focus_skills: ['listening', 'vocabulary'] };

export function LearnerWizard({ initial, dailyGoal, onDone, onSkip }: { initial: LearnerData; dailyGoal: number; onDone: () => void; onSkip?: () => void }) {
  const save = useSaveLearner();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Record<Language, Goal | null>>(() => {
    const byLang = (l: Language) => {
      const g = initial.goals.find((x) => x.language === l);
      return g ? { language: l, exam: g.exam as Goal['exam'], current_level: g.current_level, target_level: g.target_level, exam_date: g.exam_date, focus_skills: g.focus_skills } : null;
    };
    return { en: byLang('en'), zh: byLang('zh') };
  });
  const [interests, setInterests] = useState<string[]>(initial.profile?.interests ?? []);
  const [minutes, setMinutes] = useState(dailyGoal);
  const [time, setTime] = useState(initial.profile?.preferred_time ?? null);
  const [days, setDays] = useState<number[]>(initial.profile?.study_days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [habits, setHabits] = useState(initial.profile?.habit_analysis ?? true);
  const [showErrors, setShowErrors] = useState(false);

  const chosen = (['en', 'zh'] as const).filter((l) => goals[l]);
  const goalErrors = (l: Language) => (goals[l] ? validateGoal(goals[l]!) : []);
  const stepValid = [chosen.length > 0, chosen.every((l) => goalErrors(l).length === 0), true, days.length > 0][step]!;

  const next = () => {
    if (!stepValid) return setShowErrors(true);
    setShowErrors(false);
    if (step < STEPS.length - 1) return setStep(step + 1);
    save.mutate(
      {
        goals: chosen.map((l) => goals[l]!),
        interests,
        preferredTime: time as 'morning' | 'afternoon' | 'evening' | 'night' | null,
        studyDays: [...days].sort(),
        habitAnalysis: habits,
        dailyGoalMinutes: minutes,
      },
      { onSuccess: () => (toast.success('Learning profile saved'), onDone()), onError: (e) => toast.error(toUserMessage(e)) },
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-6 flex gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
            <p className={cn('mt-1.5 text-xs', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {i + 1}. {s}
            </p>
          </li>
        ))}
      </ol>

      <Card className="space-y-6 p-6">
        {step === 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">What are you learning?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['en'] as ('en' | 'zh')[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={Boolean(goals[l])}
                  onClick={() => setGoals((g) => ({ ...g, [l]: g[l] ? null : defaultGoal(l) }))}
                  className={cn('rounded-lg border p-5 text-left transition-colors', goals[l] ? 'border-primary bg-accent' : 'hover:bg-muted')}
                >
                  <p className="text-2xl font-semibold">{l === 'en' ? 'English' : '中文'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{l === 'en' ? 'IELTS or general English' : 'HSK or general Chinese'}</p>
                </button>
              ))}
            </div>
            {showErrors && !stepValid && <p className="text-sm text-destructive">Choose at least one language.</p>}
          </section>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">Your goals</h2>
            {chosen.map((l) => (
              <div key={l} className="space-y-3">
                <h3 className="font-medium">{l === 'en' ? 'English' : '中文 Chinese'}</h3>
                <GoalEditor goal={goals[l]!} onChange={(g) => setGoals((all) => ({ ...all, [l]: g }))} errors={showErrors ? goalErrors(l) : []} />
              </div>
            ))}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">What do you like?</h2>
              <p className="text-sm text-muted-foreground">We use this to pick lessons and, later, writing topics you'll enjoy.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip key={i.value} selected={interests.includes(i.value)} onClick={() => setInterests((s) => (s.includes(i.value) ? s.filter((x) => x !== i.value) : [...s, i.value]))}>
                  {i.label}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <h2 className="text-lg font-semibold">Your study time</h2>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Minutes a day</p>
              <div className="flex flex-wrap gap-2">
                {MINUTES.map((m) => (
                  <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)}>
                    {m} min
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Usually study in the…</p>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <Chip key={t.value} selected={time === t.value} onClick={() => setTime(time === t.value ? null : t.value)}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Study days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => (
                  <Chip key={d} selected={days.includes(i)} onClick={() => setDays((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}>
                    {d}
                  </Chip>
                ))}
              </div>
              {showErrors && days.length === 0 && <p className="text-sm text-destructive">Pick at least one day.</p>}
            </div>
            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="habits">Learn from my study habits</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Uses when and how long you study (already recorded for your stats) to adjust your plan. Nothing leaves your account; you can turn it off any time.
                </p>
              </div>
              <Switch id="habits" checked={habits} onCheckedChange={setHabits} />
            </div>
          </section>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => (setShowErrors(false), setStep(step - 1))}>
              <ArrowLeft /> Back
            </Button>
          ) : onSkip ? (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={next} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {step === STEPS.length - 1 ? 'Save profile' : 'Next'} {step < STEPS.length - 1 && <ArrowRight />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
