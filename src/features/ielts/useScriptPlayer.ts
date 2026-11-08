import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emphasisPhrases, splitEmphasis } from '@/lib/ielts/emphasis';
import { loadVoices, ttsSupported } from '@/lib/speech/tts';
import { assignVoices } from '@/lib/speech/voices';
import type { TestPart } from '@/lib/ielts/tests';

export type PlayerState = 'idle' | 'playing' | 'paused' | 'done';

/**
 * Reads a listening script aloud line by line, one voice per speaker (browser text-to-speech).
 * Pause stops after cancelling the current line; Play continues from that line.
 * With `stress`, the answer words and spellings are read a little slower after a short pause, the way
 * real recordings make key information clear. playLine(i) reads one line only (for listening again after marking).
 */
export function useScriptPlayer(part: TestPart | undefined, rate: number, volume = 1, stress = false) {
  const [state, setState] = useState<PlayerState>('idle');
  const [line, setLine] = useState(0);
  const [plays, setPlays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const at = useRef(0);
  // read when each sentence starts, so moving the slider applies from the next sentence without restarting
  const vol = useRef(volume);
  vol.current = volume;
  const phrases = useMemo(() => (part ? emphasisPhrases(part) : []), [part]);
  const [single, setSingle] = useState<number | null>(null);

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

  const play = useCallback(async (opts: { from?: number; only?: boolean } = {}) => {
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
    if (opts.from !== undefined) at.current = opts.from;
    const last = opts.only ? at.current : script.length - 1;
    setSingle(opts.only ? at.current : null);
    if (at.current === 0 && !opts.only) setPlays((n) => n + 1);
    setState('playing');
    for (let i = at.current; i <= last; i++) {
      if (run.current !== id) return;
      at.current = i;
      setLine(i);
      const [who = '', text = ''] = script[i]!;
      const c = cast[who];
      // one sentence per utterance: some browsers cut off long utterances (Chrome's online voices after ~15 s)
      let ended = true;
      for (const chunk of text.match(/[^.!?]+[.!?]+["')]?\s*|[^.!?]+$/g) ?? [text]) {
        // stressed pieces are separate utterances: a short gap before them, read slower
        for (const seg of stress ? splitEmphasis(chunk, phrases) : [{ text: chunk, em: false }]) {
          if (run.current !== id) return;
          if (!seg.text.trim()) continue;
          if (seg.em) await new Promise((r) => setTimeout(r, 180));
          ended = await new Promise<boolean>((resolve) => {
            const u = new SpeechSynthesisUtterance(seg.text.trim());
            if (c?.voice) {
              u.voice = c.voice;
              u.lang = c.voice.lang;
            }
            u.pitch = c?.pitch ?? 1;
            u.rate = seg.em ? Math.max(0.5, rate * 0.78) : rate;
            u.volume = vol.current;
            u.onend = () => resolve(true);
            u.onerror = () => resolve(false);
            window.speechSynthesis.speak(u);
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          });
          if (!ended) break;
        }
        if (!ended) break;
      }
      if (run.current !== id) return;
      if (!ended) {
        setState('paused');
        return;
      }
      // a short pause between turns, a little longer when the speaker changes
      if (i < last) await new Promise((r) => setTimeout(r, script[i + 1]?.[0] === who ? 250 : 500));
    }
    if (run.current !== id) return;
    setSingle(null);
    if (opts.only) {
      // one line replayed: stay paused there, so Play carries on from the next line
      at.current = Math.min(last + 1, script.length - 1);
      setState('paused');
      return;
    }
    at.current = 0;
    setLine(script.length);
    setState('done');
  }, [part, rate, stress, phrases]);

  const playLine = useCallback((i: number) => void play({ from: i, only: true }), [play]);

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

  return { state, line, single, total: part?.script?.length ?? 0, plays, error, play, playLine, pause, restart, supported: ttsSupported() };
}
