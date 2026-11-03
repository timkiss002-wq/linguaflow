import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { toUserMessage } from '@/lib/errors';
import { useUpdateProfile, type Profile } from './api';
import { PLAYBACK_RATES, type LearningSettings, type PlaybackRate } from './schemas';

const TOGGLES: { key: 'ignorePunctuation' | 'showPinyin' | 'autoNext'; label: string; description: string }[] = [
  { key: 'ignorePunctuation', label: 'Ignore punctuation when checking', description: 'Commas, periods and quotes won’t count as mistakes.' },
  { key: 'showPinyin', label: 'Show Pinyin for Chinese', description: 'Display Pinyin above characters in answers and word lookups.' },
  { key: 'autoNext', label: 'Auto Next', description: 'Move to the next sentence automatically after a correct answer.' },
];

/** Saves each change immediately; the Dictation Room reads these as its defaults. */
export function LearningPreferences({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const settings = profile.settings;

  const save = (next: Partial<LearningSettings>) =>
    update.mutate(
      { settings: { ...settings, ...next } },
      { onSuccess: () => toast.success('Preferences saved'), onError: (e) => toast.error(toUserMessage(e)) },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dictation preferences</CardTitle>
        <CardDescription>Defaults for the Dictation Room. You can still change them during a lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="rate">Default playback speed</Label>
          <div className="sm:w-40">
            <NativeSelect
              id="rate"
              value={settings.playbackRate}
              disabled={update.isPending}
              onChange={(e) => save({ playbackRate: Number(e.target.value) as PlaybackRate })}
            >
              {PLAYBACK_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor={t.key}>{t.label}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            </div>
            <Switch id={t.key} checked={settings[t.key]} disabled={update.isPending} onCheckedChange={(v) => save({ [t.key]: v })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
