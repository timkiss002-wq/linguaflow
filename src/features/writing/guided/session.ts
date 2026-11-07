import type { Band, Level, Verdict } from '@/lib/writing/guided';

/** One practice run, kept on this device so a half-done essay survives a reload. */
export interface GuidedSession {
  index: number;
  answers: Record<string, string>;
  results: Record<string, { accuracy: number; frameOk: boolean; verdict: Verdict | 'shown' }>;
  seconds: number;
}

export const sessionKey = (source: string, band: Band, level: Level) => `guided:${source}:${band}:${level}`;

export function readSession(key: string): GuidedSession | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as GuidedSession;
    return typeof s.index === 'number' && s.answers && s.results ? s : null;
  } catch {
    return null;
  }
}

export function writeSession(key: string, s: GuidedSession | null) {
  try {
    if (s) localStorage.setItem(key, JSON.stringify(s));
    else localStorage.removeItem(key);
  } catch {
    /* private mode: the run just isn't kept */
  }
}

export const emptySession = (): GuidedSession => ({ index: 0, answers: {}, results: {}, seconds: 0 });
