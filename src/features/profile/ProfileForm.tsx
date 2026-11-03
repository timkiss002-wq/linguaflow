import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { toUserMessage } from '@/lib/errors';
import { useUpdateProfile, type Profile } from './api';
import { profileSchema, type ProfileValues } from './schemas';

function timeZones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(current) ? all : [current, ...all];
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const update = useUpdateProfile();
  const zones = useMemo(() => timeZones(profile.timezone), [profile.timezone]);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: profile.display_name, timezone: profile.timezone, dailyGoalMinutes: profile.daily_goal_minutes },
  });
  const { errors, isDirty } = form.formState;

  // Keep the form in sync if the profile is refreshed elsewhere.
  useEffect(() => {
    form.reset({ displayName: profile.display_name, timezone: profile.timezone, dailyGoalMinutes: profile.daily_goal_minutes });
  }, [profile, form]);

  const onSubmit = form.handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: () => toast.success('Profile saved'),
      onError: (e) => toast.error(toUserMessage(e)),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name, time zone (used for streaks and daily stats) and daily goal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label="Display name" error={errors.displayName?.message} {...form.register('displayName')} />
          <FormField label="Email" value={email} disabled readOnly hint="Email can't be changed yet." />
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Time zone</Label>
            <NativeSelect id="timezone" aria-invalid={errors.timezone ? true : undefined} {...form.register('timezone')}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll('_', ' ')}
                </option>
              ))}
            </NativeSelect>
            {errors.timezone && <p className="text-xs text-destructive">{errors.timezone.message}</p>}
          </div>
          <FormField
            label="Daily goal (minutes)"
            type="number"
            inputMode="numeric"
            min={5}
            max={240}
            error={errors.dailyGoalMinutes?.message}
            {...form.register('dailyGoalMinutes')}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending && <Loader2 className="animate-spin" />}
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
