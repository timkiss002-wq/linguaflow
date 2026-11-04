import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useUpdateProfile, type Profile } from './api';
import type { LearningSettings } from './schemas';

const STAGES = ['Mới (New)', 'Đang học (Learning)', 'Ôn lại (Reviewing)', 'Thành thạo (Mastered)'];

/** Spaced review: SM-2 or the learner's own fixed intervals (like their sheet's settings tab). */
export function ReviewPreferences({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const s = profile.settings;
  const [intervals, setIntervals] = useState(s.fixedIntervals.map(String));
  const [newPerDay, setNewPerDay] = useState(String(s.newPerDay));

  const save = (patch: Partial<LearningSettings>) =>
    update.mutate({ settings: { ...s, ...patch } }, { onSuccess: () => toast.success('Review settings saved'), onError: (e) => toast.error(toUserMessage(e)) });

  const saveIntervals = () => {
    const nums = intervals.map((v) => Number(v));
    if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 365)) return toast.error('Intervals must be whole numbers from 1 to 365 days.');
    if (nums.join() !== s.fixedIntervals.join()) save({ fixedIntervals: nums });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spaced review</CardTitle>
        <CardDescription>How flashcards are scheduled after you rate them.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Scheduling method">
          {([
            ['sm2', 'SM-2 (recommended)', 'Like Anki: intervals grow with how well you know each word.'],
            ['fixed', 'Fixed intervals', 'Like your sheet: each status waits a set number of days.'],
          ] as const).map(([value, title, desc]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={s.srsMode === value}
              onClick={() => s.srsMode !== value && save({ srsMode: value })}
              className={cn('rounded-lg border p-3 text-left', s.srsMode === value ? 'border-primary bg-accent' : 'hover:bg-muted')}
            >
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>

        {s.srsMode === 'fixed' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAGES.map((label, i) => (
              <div key={label} className="space-y-1">
                <Label htmlFor={`fi-${i}`} className="text-xs">
                  {label}
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id={`fi-${i}`}
                    type="number"
                    min={1}
                    max={365}
                    value={intervals[i]}
                    onChange={(e) => setIntervals((v) => v.map((x, k) => (k === i ? e.target.value : x)))}
                    onBlur={saveIntervals}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="new-per-day">New cards per day</Label>
            <p className="mt-1 text-xs text-muted-foreground">Fewer new cards = shorter daily reviews.</p>
          </div>
          <Input
            id="new-per-day"
            type="number"
            min={0}
            max={200}
            value={newPerDay}
            onChange={(e) => setNewPerDay(e.target.value)}
            onBlur={() => {
              const n = Number(newPerDay);
              if (!Number.isInteger(n) || n < 0 || n > 200) return toast.error('Enter 0–200.');
              if (n !== s.newPerDay) save({ newPerDay: n });
            }}
            className="h-9 w-24"
          />
        </div>
      </CardContent>
    </Card>
  );
}
