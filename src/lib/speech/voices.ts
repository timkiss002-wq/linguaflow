/** Pure voice-selection logic (no browser APIs) so it can be unit-tested. */
export interface VoiceInfo {
  name: string;
  lang: string; // BCP-47, e.g. "zh-CN", "en_US" on some Android builds
  localService: boolean;
  default?: boolean;
}

export type SpeechLanguage = 'en' | 'zh';

const PRIMARY: Record<SpeechLanguage, string[]> = {
  zh: ['zh-cn', 'zh-hans', 'cmn-hans-cn', 'cmn-cn'],
  en: ['en-us', 'en-gb'],
};

const normalize = (lang: string) => lang.toLowerCase().replace('_', '-');

export function matchesLanguage(v: VoiceInfo, language: SpeechLanguage): boolean {
  const l = normalize(v.lang);
  if (language === 'zh') return l.startsWith('zh') || l.startsWith('cmn');
  return l.startsWith('en');
}

/** Higher is better. Prefers Mandarin (mainland) over Cantonese/Taiwan, and natural/neural voices. */
export function scoreVoice(v: VoiceInfo, language: SpeechLanguage): number {
  if (!matchesLanguage(v, language)) return -1;
  const l = normalize(v.lang);
  const name = v.name.toLowerCase();
  let score = 0;
  const idx = PRIMARY[language].indexOf(l);
  if (idx >= 0) score += 40 - idx * 5;
  if (language === 'zh' && (l.includes('hk') || l.includes('yue') || name.includes('cantonese'))) score -= 30;
  if (language === 'zh' && l.includes('tw')) score -= 10;
  if (/natural|neural|online|premium|enhanced/.test(name)) score += 20;
  if (/google/.test(name)) score += 15;
  if (/xiaoxiao|yunxi|tingting|aria|jenny|samantha|daniel/.test(name)) score += 10;
  if (v.default) score += 2;
  return score;
}

export function voicesFor(voices: VoiceInfo[], language: SpeechLanguage): VoiceInfo[] {
  return voices
    .filter((v) => matchesLanguage(v, language))
    .sort((a, b) => scoreVoice(b, language) - scoreVoice(a, language) || a.name.localeCompare(b.name));
}

/** The user's saved voice if it still exists on this device, otherwise the best match. */
export function pickVoice<T extends VoiceInfo>(voices: T[], language: SpeechLanguage, preferredName?: string | null): T | null {
  if (preferredName) {
    const saved = voices.find((v) => v.name === preferredName && matchesLanguage(v, language));
    if (saved) return saved;
  }
  return (voicesFor(voices, language)[0] as T | undefined) ?? null;
}
