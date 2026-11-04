import { Volume2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { useVoices } from '@/features/audio/useVoices';
import { toUserMessage } from '@/lib/errors';
import { speak } from '@/lib/speech/tts';
import { pickVoice, type SpeechLanguage } from '@/lib/speech/voices';
import { useUpdateProfile, type Profile } from './api';
import { PLAYBACK_RATES, type LearningSettings, type PlaybackRate } from './schemas';

const TOGGLES: { key: 'ignorePunctuation' | 'showPinyin' | 'autoNext'; label: string; description: string }[] = [
  { key: 'ignorePunctuation', label: 'Ignore punctuation when checking', description: 'Commas, periods and quotes won’t count as mistakes.' },
  { key: 'showPinyin', label: 'Show Pinyin for Chinese', description: 'Display Pinyin above characters in answers and word lookups.' },
  { key: 'autoNext', label: 'Auto Next', description: 'Move to the next sentence automatically after a correct answer.' },
];

const SAMPLE: Record<SpeechLanguage, string> = { en: 'Practice makes perfect.', zh: '你好，今天我们一起练习听力吧。' };

/** Saves each change immediately; lessons and the Dictation Room read these as defaults. */
export function LearningPreferences({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const settings = profile.settings;
  const { supported, ready, voicesFor, voices } = useVoices();
  const [volume, setVolume] = useState(settings.volume);

  const save = (next: Partial<LearningSettings>) =>
    update.mutate(
      { settings: { ...settings, ...next } },
      { onSuccess: () => toast.success('Preferences saved'), onError: (e) => toast.error(toUserMessage(e)) },
    );

  const test = (language: SpeechLanguage) =>
    speak(SAMPLE[language], {
      language,
      rate: settings.playbackRate,
      volume: settings.volume / 100,
      voiceName: language === 'zh' ? settings.voiceZh : settings.voiceEn,
    }).catch((e) => toast.error(toUserMessage(e)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening &amp; dictation</CardTitle>
        <CardDescription>Defaults for lessons and the Dictation Room. You can still change speed during a lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(['zh', 'en'] as const).map((language) => {
          const list = voicesFor(language);
          const key = language === 'zh' ? 'voiceZh' : 'voiceEn';
          const active = pickVoice(voices, language, settings[key]);
          return (
            <div key={language} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label htmlFor={`voice-${language}`}>{language === 'zh' ? 'Chinese voice' : 'English voice'}</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {!supported
                    ? 'This browser has no text-to-speech.'
                    : !ready
                      ? 'Loading voices…'
                      : list.length === 0
                        ? 'No voice installed on this device.'
                        : `${list.length} available on this device.`}
                </p>
              </div>
              <div className="flex gap-2 sm:w-80">
                <NativeSelect
                  id={`voice-${language}`}
                  value={settings[key] ?? ''}
                  disabled={!ready || list.length === 0 || update.isPending}
                  onChange={(e) => save({ [key]: e.target.value || null })}
                >
                  <option value="">Automatic{active && !settings[key] ? ` (${active.name})` : ''}</option>
                  {list.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} · {v.lang}
                    </option>
                  ))}
                </NativeSelect>
                <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label={`Test ${language === 'zh' ? 'Chinese' : 'English'} voice`} disabled={list.length === 0} onClick={() => test(language)}>
                  <Volume2 />
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="volume">Volume</Label>
          <div className="flex items-center gap-3 sm:w-80">
            <input
              id="volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onPointerUp={() => volume !== settings.volume && save({ volume })}
              onKeyUp={() => volume !== settings.volume && save({ volume })}
              className="flex-1 accent-[hsl(var(--primary))]"
            />
            <span className="w-10 text-right text-sm tabular-nums">{volume}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="rate">Default speed</Label>
          <div className="sm:w-40">
            <NativeSelect id="rate" value={settings.playbackRate} disabled={update.isPending} onChange={(e) => save({ playbackRate: Number(e.target.value) as PlaybackRate })}>
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
