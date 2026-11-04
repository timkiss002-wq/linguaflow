import { z } from 'zod';
import { HSK_LEVELS, LANGUAGES, LEVELS } from './constants';

const langValues = LANGUAGES.map((l) => l.value) as [string, ...string[]];
const levelValues = LEVELS.map((l) => l.value) as [string, ...string[]];

/** Library filters live in the URL so they survive reloads and can be shared. Bad values are dropped. */
const schema = z.object({
  q: z.string().trim().max(100).catch('').optional(),
  lang: z.enum(langValues).optional().catch(undefined),
  level: z.enum(levelValues).optional().catch(undefined),
  hsk: z.coerce
    .number()
    .int()
    .refine((n) => (HSK_LEVELS as readonly number[]).includes(n))
    .optional()
    .catch(undefined),
  topic: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional()
    .catch(undefined),
  fav: z
    .literal('1')
    .optional()
    .catch(undefined),
});

export interface LibraryFilters {
  q: string;
  lang?: 'en' | 'zh';
  level?: (typeof LEVELS)[number]['value'];
  hsk?: number;
  topic?: string;
  favoritesOnly: boolean;
}

export function parseFilters(params: URLSearchParams): LibraryFilters {
  const raw = Object.fromEntries([...params.entries()].filter(([, v]) => v !== ''));
  const p = schema.parse(raw);
  const lang = p.lang as LibraryFilters['lang'];
  return {
    q: p.q ?? '',
    lang,
    level: p.level as LibraryFilters['level'],
    // HSK only applies to Chinese (or when no language is chosen).
    hsk: lang === 'en' ? undefined : p.hsk,
    topic: p.topic,
    favoritesOnly: p.fav === '1',
  };
}

export function toSearchParams(f: LibraryFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (f.q.trim()) out.set('q', f.q.trim());
  if (f.lang) out.set('lang', f.lang);
  if (f.level) out.set('level', f.level);
  if (f.hsk && f.lang !== 'en') out.set('hsk', String(f.hsk));
  if (f.topic) out.set('topic', f.topic);
  if (f.favoritesOnly) out.set('fav', '1');
  return out;
}

export const hasActiveFilters = (f: LibraryFilters) => Boolean(f.q || f.lang || f.level || f.hsk || f.topic || f.favoritesOnly);

/** Escape characters that have meaning inside a PostgREST ilike filter / or() expression. */
export function escapeSearch(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, ' ');
}
