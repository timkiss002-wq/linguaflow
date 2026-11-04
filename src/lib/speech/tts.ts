import { pickVoice, voicesFor, type SpeechLanguage } from './voices';

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/** Voices load asynchronously in Chrome; resolve when available (or after a short timeout). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  voicesPromise ??= new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, 2000);
  }).then((list) => {
    if (!list.length) voicesPromise = null; // try again next time
    return list;
  });
  return voicesPromise ?? Promise.resolve([]);
}

export function listVoices(voices: SpeechSynthesisVoice[], language: SpeechLanguage) {
  return voicesFor(voices, language) as SpeechSynthesisVoice[];
}

export interface SpeakOptions {
  language: SpeechLanguage;
  voiceName?: string | null;
  rate?: number; // 0.5 – 1.25 in the app
  volume?: number; // 0 – 1
}

export class SpeechError extends Error {
  constructor(public reason: 'unsupported' | 'no-voice' | 'failed', message: string) {
    super(message);
  }
}

/**
 * Speaks `text`; resolves when finished or when cancelled by a newer call/stop().
 * Rejects with SpeechError when the device can't speak this language.
 */
export async function speak(text: string, opts: SpeakOptions): Promise<'ended' | 'cancelled'> {
  if (!ttsSupported()) throw new SpeechError('unsupported', 'This browser cannot play speech.');
  const voices = await loadVoices();
  const voice = pickVoice(voices, opts.language, opts.voiceName);
  if (!voice) {
    throw new SpeechError(
      'no-voice',
      opts.language === 'zh'
        ? 'No Chinese (Mandarin) voice is installed on this device.'
        : 'No English voice is installed on this device.',
    );
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // one sentence at a time

  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = opts.rate ?? 1;
    u.volume = opts.volume ?? 1;
    u.onend = () => resolve('ended');
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') resolve('cancelled');
      else reject(new SpeechError('failed', `Speech failed (${e.error}).`));
    };
    synth.speak(u);
    // Chrome sometimes starts paused after a tab switch.
    if (synth.paused) synth.resume();
  });
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
