import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { EXAMS, SKILLS, type Exam, type Goal } from '@/lib/personal/goals';
import { Chip } from './Chip';

/** Exam, current → target level, optional exam date and focus skills for one language. */
export function GoalEditor({ goal, onChange, errors }: { goal: Goal; onChange: (g: Goal) => void; errors: string[] }) {
  const exams = (Object.keys(EXAMS) as Exam[]).filter((e) => EXAMS[e].languages.includes(goal.language));
  const exam = EXAMS[goal.exam];
  const id = (k: string) => `${goal.language}-${k}`;
  const setExam = (e: Exam) => {
    const levels = EXAMS[e].levels;
    onChange({ ...goal, exam: e, current_level: levels[Math.floor(levels.length / 3)]!, target_level: levels[Math.floor(levels.length / 3) + 1]! });
  };

  return (
    <div className="space-y-4" data-testid={`goal-${goal.language}`}>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Goal</p>
        <div className="flex flex-wrap gap-2">
          {exams.map((e) => (
            <Chip key={e} selected={goal.exam === e} onClick={() => setExam(e)}>
              {EXAMS[e].label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={id('current')}>Current level</Label>
          <NativeSelect id={id('current')} value={goal.current_level} onChange={(e) => onChange({ ...goal, current_level: e.target.value })}>
            {exam.levels.map((l) => (
              <option key={l} value={l}>
                {exam.describe(l)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('target')}>Target</Label>
          <NativeSelect id={id('target')} value={goal.target_level} onChange={(e) => onChange({ ...goal, target_level: e.target.value })}>
            {exam.levels.map((l) => (
              <option key={l} value={l}>
                {exam.describe(l)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('date')}>Exam / deadline (optional)</Label>
          <Input id={id('date')} type="date" value={goal.exam_date ?? ''} onChange={(e) => onChange({ ...goal, exam_date: e.target.value || null })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Focus on</p>
        <div className="flex flex-wrap gap-2">
          {SKILLS.filter((s) => s.languages.includes(goal.language)).map((s) => (
            <Chip
              key={s.value}
              selected={goal.focus_skills.includes(s.value)}
              onClick={() => onChange({ ...goal, focus_skills: goal.focus_skills.includes(s.value) ? goal.focus_skills.filter((x) => x !== s.value) : [...goal.focus_skills, s.value] })}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </div>
      {errors.length > 0 && (
        <ul className="space-y-0.5 text-sm text-destructive" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
