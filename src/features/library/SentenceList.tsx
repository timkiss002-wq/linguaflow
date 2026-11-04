import { Eye, EyeOff, Languages, Pause, Play, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { SpeechErrorNotice } from '@/features/audio/SpeechErrorNotice';
import { useSpeech } from '@/features/audio/useSpeech';
import { SentenceText } from '@/features/lessons/SentenceText';
import { PLAYBACK_RATES } from '@/features/profile/schemas';
import { useWordLookup } from '@/features/vocabulary/useWordLookup';
import { useProfile } from '@/features/profile/api';
import { cn } from '@/lib/utils';
import type { Sentence } from './api';
import type { Language } from './constants';

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" aria-pressed={pressed} onClick={onClick} className={cn(pressed && 'bg-accent text-accent-foreground')}>
      {children}
    </Button>
  );
}

/** Listen to every sentence; text, pinyin and translation are hidden until the learner asks. */
export function SentenceList({ sentences, language, lessonId }: { sentences: Sentence[]; language: Language; lessonId: string }) {
  const { data: profile } = useProfile();
  const lookup = useWordLookup(language);
  const speech = useSpeech(language);
  const [rate, setRate] = useState<number | null>(null);
  const currentRate = rate ?? speech.defaultRate;
  const [showText, setShowText] = useState(false);
  const [showPinyin, setShowPinyin] = useState<boolean | null>(null);
  const pinyinOn = showPinyin ?? profile?.settings.showPinyin ?? true;
  const [showTranslation, setShowTranslation] = useState(false);
  const playingAll = speech.playingKey !== null && speech.playingKey.startsWith('all:');

  return (
    <div className="space-y-3">
      {lookup.popover}
      {showText && <p className="text-xs text-muted-foreground">Tip: click any word to look it up and save it.</p>}
      {speech.error && <SpeechErrorNotice error={speech.error} language={language} />}
      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
          <Button
            size="sm"
            onClick={() =>
              playingAll
                ? speech.stop()
                : speech.playAll(sentences.map((s) => ({ key: `all:${s.id}`, text: s.text })), currentRate)
            }
          >
            {playingAll ? <Pause /> : <Play />} {playingAll ? 'Stop' : 'Play all'}
          </Button>
          <div className="w-24">
            <NativeSelect aria-label="Speed" value={currentRate} onChange={(e) => setRate(Number(e.target.value))} className="h-8 text-xs">
              {PLAYBACK_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="ml-auto flex flex-wrap gap-1">
            <Toggle pressed={showText} onClick={() => setShowText((v) => !v)}>
              {showText ? <EyeOff /> : <Eye />} Text
            </Toggle>
            {language === 'zh' && (
              <Toggle pressed={pinyinOn} onClick={() => setShowPinyin(!pinyinOn)}>
                Pinyin
              </Toggle>
            )}
            <Toggle pressed={showTranslation} onClick={() => setShowTranslation((v) => !v)}>
              <Languages /> Tiếng Việt
            </Toggle>
          </div>
        </div>
        <ol className="divide-y">
          {sentences.map((s) => {
            const key = speech.playingKey?.endsWith(s.id) ?? false;
            return (
              <li key={s.id} className={cn('flex items-start gap-3 px-3 py-3 sm:px-4', key && 'bg-accent/40')}>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 rounded-full"
                  aria-label={`Play sentence ${s.position}`}
                  onClick={() => (key ? speech.stop() : speech.play(`one:${s.id}`, s.text, currentRate))}
                >
                  {key ? <Pause /> : <Volume2 />}
                </Button>
                <span className="w-5 shrink-0 pt-1.5 text-right text-xs tabular-nums text-muted-foreground">{s.position}</span>
                <div className="min-w-0 flex-1 pt-1">
                  {showText ? (
                    <SentenceText
                      text={s.text}
                      language={language}
                      showPinyin={pinyinOn}
                      pinyinOverride={s.pinyin}
                      className="text-[15px]"
                      onWordClick={(word, element) =>
                        lookup.open({ word, element, sentence: s.text, sentenceTranslation: s.translation_vi, lessonId, sentenceId: s.id })
                      }
                    />
                  ) : (
                    <span className="select-none text-sm italic text-muted-foreground">Hidden — listen first</span>
                  )}
                  {showTranslation && s.translation_vi && <p className="mt-1 text-sm text-muted-foreground">{s.translation_vi}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
