import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeechError, speak, stopSpeaking } from '@/lib/speech/tts';
import type { SpeechLanguage } from '@/lib/speech/voices';
import { useProfile } from '@/features/profile/api';
import { DEFAULT_SETTINGS } from '@/features/profile/schemas';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plays sentences with the learner's voice/volume settings. Only one thing plays at a time. */
export function useSpeech(language: SpeechLanguage) {
  const { data: profile } = useProfile();
  const settings = profile?.settings ?? DEFAULT_SETTINGS;
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [error, setError] = useState<SpeechError | null>(null);
  /** Bumped by every new play/stop; a stale run must not touch state. */
  const runId = useRef(0);
  /** Bumped whenever a "play all" sequence must end. */
  const sequenceId = useRef(0);

  const playOne = useCallback(
    async (key: string, text: string, rate: number): Promise<'ended' | 'cancelled' | 'error'> => {
      const id = ++runId.current;
      setError(null);
      setPlayingKey(key);
      try {
        return await speak(text, {
          language,
          rate,
          volume: settings.volume / 100,
          voiceName: language === 'zh' ? settings.voiceZh : settings.voiceEn,
        });
      } catch (e) {
        if (id === runId.current) setError(e instanceof SpeechError ? e : new SpeechError('failed', String(e)));
        return 'error';
      } finally {
        if (id === runId.current) setPlayingKey(null);
      }
    },
    [language, settings.volume, settings.voiceEn, settings.voiceZh],
  );

  const stop = useCallback(() => {
    sequenceId.current += 1;
    runId.current += 1;
    stopSpeaking();
    setPlayingKey(null);
  }, []);

  // Stop audio when leaving the page.
  useEffect(() => stop, [stop]);

  /** Play a single sentence (interrupts anything playing, including "play all"). */
  const play = useCallback(
    (key: string, text: string, rate: number) => {
      sequenceId.current += 1;
      return playOne(key, text, rate);
    },
    [playOne],
  );

  /** Plays items one after another with a short pause until done or interrupted. */
  const playAll = useCallback(
    async (items: { key: string; text: string }[], rate: number) => {
      const seq = ++sequenceId.current;
      for (const [i, item] of items.entries()) {
        if (seq !== sequenceId.current) return;
        const result = await playOne(item.key, item.text, rate);
        if (result !== 'ended' || seq !== sequenceId.current) return;
        if (i < items.length - 1) await pause(700);
      }
    },
    [playOne],
  );

  return { play, playAll, stop, playingKey, error, defaultRate: settings.playbackRate };
}
