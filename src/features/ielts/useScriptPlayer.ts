import { useCallback, useEffect, useRef, useState } from 'react';
import { loadVoices, ttsSupported } from '@/lib/speech/tts';
import { assignVoices } from '@/lib/speech/voices';
import type { TestPart } from '@/lib/ielts/tests';

export type PlayerState = 'idle' | 'playing' | 'paused' | 'done';

/**
 * Reads a listening script aloud line by line, one voice per speaker (browser text-to-speech).
 * Pause stops after cancelling the current line; Play continues from that line.
 */
export function useScriptPlayer(part: TestPart | undefined, rate: number) {
  const [state, setState] = useState<PlayerState>('idle');
  const [line, setLine] = useState(0);
  const [plays, setPlays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const at = useRef(0);

  const stopAll = useCallback(() => {
    run.current += 1;
    if (ttsSupported()) window.speechSynthesis.cancel();
  }, []);

  // a new part starts from the beginning
  useEffect(() => {
    stopAll();
    at.current = 0;
    setLine(0);
    setState('idle');
    setPlays(0);
    return stopAll;
  }, [part?.id, stopAll]);

  const play = useCallback(async () => {
    const script = part?.script;
    if (!part || !script?.length) return;
    if (!ttsSupported()) {
      setError('Trình duyệt này không đọc được âm thanh. Hãy dùng Chrome hoặc Edge.');
      return;
    }
    const id = ++run.current;
    window.speechSynthesis.cancel();
    const voices = await loadVoices();
    const cast = assignVoices(voices, Object.entries(part.speakers ?? {}).map(([key, s]) => ({ key, voice: s.voice })));
    if (!Object.values(cast).some((c) => c.voice)) {
      setError('Máy chưa cài giọng đọc tiếng Anh.');
      return;
    }
    setError(null);
    if (at.current === 0) setPlays((n) => n + 1);
    setState('playing');
    for (let i = at.current; i < script.length; i++) {
      if (run.current !== id) return;
      at.current = i;
      setLine(i);
      const [who = '', text = ''] = script[i]!;
      const c = cast[who];
      // one sentence per utterance: some browsers cut off long utterances (Chrome's online voices after ~15 s)
      let ended = true;
      for (const chunk of text.match(/[^.!?]+[.!?]+["')]?\s*|[^.!?]+$/g) ?? [text]) {
        if (run.current !== id) return;
        ended = await new Promise<boolean>((resolve) => {
          const u = new SpeechSynthesisUtterance(chunk.trim());
          if (c?.voice) {
            u.voice = c.voice;
            u.lang = c.voice.lang;
          }
          u.pitch = c?.pitch ?? 1;
          u.rate = rate;
          u.onend = () => resolve(true);
          u.onerror = () => resolve(false);
          window.speechSynthesis.speak(u);
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        });
        if (!ended) break;
      }
      if (run.current !== id) return;
      if (!ended) {
        setState('paused');
        return;
      }
      // a short pause between turns, a little longer when the speaker changes
      await new Promise((r) => setTimeout(r, script[i + 1]?.[0] === who ? 250 : 500));
    }
    if (run.current !== id) return;
    at.current = 0;
    setLine(script.length);
    setState('done');
  }, [part, rate]);

  const pause = useCallback(() => {
    stopAll();
    setState('paused');
  }, [stopAll]);

  const restart = useCallback(() => {
    stopAll();
    at.current = 0;
    setLine(0);
    setState('idle');
  }, [stopAll]);

  return { state, line, total: part?.script?.length ?? 0, plays, error, play, pause, restart, supported: ttsSupported() };
}
