export const POS = ['noun', 'verb', 'adj', 'adv', 'idiom', 'phrase', 'other'] as const;
export type Pos = (typeof POS)[number];

export const POS_LABEL: Record<Pos, string> = {
  noun: 'Noun',
  verb: 'Verb',
  adj: 'Adj',
  adv: 'Adv',
  idiom: 'Idiom',
  phrase: 'Phrase',
  other: 'Other',
};

/** Tailwind classes per type — same colour family as the learner's Google Sheet dropdown. */
export const POS_CLASS: Record<Pos, string> = {
  noun: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  verb: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  adj: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  adv: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  idiom: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  phrase: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  other: 'bg-muted text-muted-foreground',
};

const ALIASES: Record<string, Pos> = {
  n: 'noun', noun: 'noun', 'danh từ': 'noun', 名词: 'noun',
  v: 'verb', verb: 'verb', 'động từ': 'verb', 动词: 'verb',
  adj: 'adj', adjective: 'adj', a: 'adj', 'tính từ': 'adj', 形容词: 'adj',
  adv: 'adv', adverb: 'adv', 'trạng từ': 'adv', 副词: 'adv',
  idiom: 'idiom', 'thành ngữ': 'idiom', 成语: 'idiom',
  phrase: 'phrase', 'phrasal verb': 'phrase', collocation: 'phrase', 'cụm từ': 'phrase',
};

/** Maps "Noun", "adjective", "Adj", "động từ"… to our codes; unknown → null. */
export function normalizePos(value: string | null | undefined): Pos | null {
  if (!value) return null;
  const k = value.trim().toLowerCase().replace(/\.$/, '');
  return ALIASES[k] ?? null;
}
