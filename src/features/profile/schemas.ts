import { z } from 'zod';
import type { Json } from '@/types/database';

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/** Stored in profiles.settings (jsonb). Unknown/invalid keys fall back to defaults instead of crashing. */
export const learningSettingsSchema = z.object({
  playbackRate: z
    .number()
    .refine((n): n is PlaybackRate => (PLAYBACK_RATES as readonly number[]).includes(n))
    .catch(1),
  ignorePunctuation: z.boolean().catch(true),
  showPinyin: z.boolean().catch(true),
  autoNext: z.boolean().catch(false),
  /** Speech volume 0–100. */
  volume: z.number().int().min(0).max(100).catch(100),
  /** Preferred TTS voice names; null = pick the best available on this device. */
  voiceEn: z.string().max(200).nullable().catch(null),
  voiceZh: z.string().max(200).nullable().catch(null),
});
export type LearningSettings = { playbackRate: PlaybackRate } & Omit<z.infer<typeof learningSettingsSchema>, 'playbackRate'>;

export const DEFAULT_SETTINGS: LearningSettings = {
  playbackRate: 1,
  ignorePunctuation: true,
  showPinyin: true,
  autoNext: false,
  volume: 100,
  voiceEn: null,
  voiceZh: null,
};

export function parseSettings(raw: Json | null | undefined): LearningSettings {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return learningSettingsSchema.parse({ ...DEFAULT_SETTINGS, ...obj }) as LearningSettings;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Name is required').max(50, 'At most 50 characters'),
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  dailyGoalMinutes: z.coerce.number().int().min(5, 'At least 5 minutes').max(240, 'At most 240 minutes'),
});
export type ProfileValues = z.infer<typeof profileSchema>;
