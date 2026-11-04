import type { Enums } from '@/types/database';

export type Language = Enums<'language_code'>;
export type CefrLevel = Enums<'cefr_level'>;

export const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'zh', label: 'Chinese', native: '中文' },
];

export const LEVELS: { value: CefrLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'upper_intermediate', label: 'Upper-Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const levelLabel = (v: CefrLevel) => LEVELS.find((l) => l.value === v)?.label ?? v;
export const languageLabel = (v: Language) => LANGUAGES.find((l) => l.value === v)?.label ?? v;

export const DIFFICULTY_LABELS = ['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'] as const;
