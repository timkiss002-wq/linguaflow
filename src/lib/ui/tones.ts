/**
 * One colour per area of the app, so learners always know where they are:
 * Home = orange, Lessons (listening) = teal, Words = violet, Writing = rose, Progress = sky.
 * Full class strings (not built from parts) so Tailwind keeps them.
 */
export type Tone = 'orange' | 'teal' | 'violet' | 'rose' | 'sky' | 'amber' | 'slate';

export const TONE: Record<Tone, { tile: string; soft: string; text: string; solid: string; ring: string; bar: string }> = {
  orange: {
    tile: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    soft: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-300',
    solid: 'bg-orange-700 text-white',
    ring: 'ring-orange-200 dark:ring-orange-500/30',
    bar: 'bg-orange-500',
  },
  teal: {
    tile: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    soft: 'bg-teal-50 dark:bg-teal-500/10',
    text: 'text-teal-700 dark:text-teal-300',
    solid: 'bg-teal-600 text-white',
    ring: 'ring-teal-200 dark:ring-teal-500/30',
    bar: 'bg-teal-500',
  },
  violet: {
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    soft: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-300',
    solid: 'bg-violet-600 text-white',
    ring: 'ring-violet-200 dark:ring-violet-500/30',
    bar: 'bg-violet-500',
  },
  rose: {
    tile: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    soft: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    solid: 'bg-rose-600 text-white',
    ring: 'ring-rose-200 dark:ring-rose-500/30',
    bar: 'bg-rose-500',
  },
  sky: {
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    soft: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    solid: 'bg-sky-700 text-white',
    ring: 'ring-sky-200 dark:ring-sky-500/30',
    bar: 'bg-sky-500',
  },
  amber: {
    tile: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    soft: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-800 dark:text-amber-300',
    solid: 'bg-amber-700 text-white',
    ring: 'ring-amber-200 dark:ring-amber-500/30',
    bar: 'bg-amber-500',
  },
  slate: {
    tile: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    soft: 'bg-slate-50 dark:bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-300',
    solid: 'bg-slate-700 text-white',
    ring: 'ring-slate-200 dark:ring-slate-500/30',
    bar: 'bg-slate-500',
  },
};
