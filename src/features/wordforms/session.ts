import { makeFixItem, shuffle, sortableWords, buildIndex, type Family, type FamilyExample, type FamilyMember } from '@/lib/wordforms';

export type ExerciseKind = 'gap' | 'fix' | 'grid' | 'sort';

export const EXERCISES: Record<ExerciseKind, { title: string; description: string; size: number }> = {
  gap: { title: 'Gap fill', description: 'Write the right form of the word in brackets — IELTS/TOEIC style.', size: 10 },
  fix: { title: 'Fix the error', description: 'One word is in the wrong form. Type the correct form.', size: 10 },
  grid: { title: 'Complete the family', description: 'Fill in the noun, verb, adjective and adverb.', size: 5 },
  sort: { title: 'Quick sort', description: 'Is it a noun, verb, adjective or adverb? Answer fast.', size: 20 },
};

export type Item =
  | { kind: 'gap'; family: Family; example: FamilyExample }
  | { kind: 'fix'; family: Family; example: FamilyExample; wrong: string; sentence: string }
  | { kind: 'grid'; family: Family }
  | { kind: 'sort'; family: Family; member: FamilyMember };

/** Families to practise: ones linked to the learner's notebook words, or all, optionally one trap type. */
export function selectFamilies(all: Family[], opts: { notebookTerms?: string[]; trap?: string }): Family[] {
  let pool = all;
  if (opts.notebookTerms) {
    const index = buildIndex(all);
    const ids = new Set(opts.notebookTerms.flatMap((t) => index.lookup(t).map((h) => h.family.id)));
    pool = pool.filter((f) => ids.has(f.id));
  }
  if (opts.trap) pool = pool.filter((f) => f.traps.includes(opts.trap!));
  return pool;
}

export function buildItems(kind: ExerciseKind, families: Family[], seed: number): Item[] {
  const size = EXERCISES[kind].size;
  if (kind === 'grid') return shuffle(families, seed).slice(0, size).map((family) => ({ kind, family }));
  if (kind === 'sort') {
    const index = buildIndex(families);
    const byWord = new Map(families.flatMap((f) => f.members.map((m) => [m.word.toLowerCase(), f] as const)));
    return shuffle(sortableWords(index), seed)
      .slice(0, size)
      .map((member) => ({ kind, member, family: byWord.get(member.word.toLowerCase())! }));
  }
  const examples = shuffle(
    families.flatMap((family) => family.examples.map((example) => ({ family, example }))),
    seed,
  );
  if (kind === 'gap') return examples.slice(0, size).map((e) => ({ kind, ...e }));
  return examples
    .map((e, i) => {
      const fix = makeFixItem(e.family, e.example, seed + i);
      return fix ? { kind, ...e, ...fix } : null;
    })
    .filter((x): x is Extract<Item, { kind: 'fix' }> => x !== null)
    .slice(0, size);
}
