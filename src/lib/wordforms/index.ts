import { spellingSimilarity } from '@/lib/compare/align';

export type FormPos = 'noun' | 'verb' | 'adj' | 'adv';
export const FORM_POS: FormPos[] = ['noun', 'verb', 'adj', 'adv'];

/** "a noun", "a verb", "an adjective", "an adverb" — for sentences in feedback. */
export const POS_WITH_ARTICLE: Record<FormPos, string> = { noun: 'a noun', verb: 'a verb', adj: 'an adjective', adv: 'an adverb' };
export const POS_NAME: Record<FormPos, string> = { noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb' };

export interface FamilyMember {
  word: string;
  pos: FormPos;
  meaning_vi: string | null;
}
export interface FamilyExample {
  id: number;
  sentence: string; // answer in [brackets]
  answer: string;
  answer_pos: FormPos;
  base_word: string;
  why: string;
}
export interface Family {
  id: string;
  note: string | null;
  traps: string[];
  members: FamilyMember[];
  examples: FamilyExample[];
}

export const TRAP_INFO: Record<string, { title: string; tip: string }> = {
  'ic-ical': { title: '-ic hay -ical?', tip: 'Cùng gốc nhưng khác nghĩa: economic (kinh tế) ≠ economical (tiết kiệm).' },
  'ly-adj': { title: 'Đuôi -ly nhưng là tính từ', tip: 'friendly, costly, likely, deadly là tính từ — không dùng làm trạng từ.' },
  'al-noun': { title: 'Đuôi -al nhưng là danh từ', tip: 'arrival, approval, proposal, survival là danh từ.' },
  'ed-ing': { title: '-ed hay -ing?', tip: 'Người cảm thấy → -ed (bored); vật gây ra cảm giác → -ing (boring).' },
  'same-form': { title: 'Một chữ, nhiều loại từ', tip: 'increase, benefit, cost, hard… cùng một hình thức nhưng có thể là danh/động/tính/trạng từ — xem vị trí trong câu.' },
  irregular: { title: 'Biến đổi bất quy tắc', tip: 'die → death/dead, high → height, strong → strength: không theo hậu tố thông thường.' },
  confusable: { title: 'Dễ nhầm nghĩa', tip: 'sensible ≠ sensitive, successful ≠ successive, industrial ≠ industrious.' },
};

/** Possible dictionary forms of an inflected word (similarities → similarity, financed → finance…). */
export function lemmas(word: string): string[] {
  const w = word.trim().toLowerCase();
  const out = [w];
  if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) out.push(w.slice(0, -2));
  if (w.endsWith('s')) out.push(w.slice(0, -1));
  if (w.endsWith('ied')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3));
  if (w.endsWith('ing')) out.push(w.slice(0, -3), w.slice(0, -3) + 'e', w.slice(0, -4));
  return [...new Set(out)];
}

export interface FamilyHit {
  family: Family;
  member: FamilyMember;
  exact: boolean;
}

export interface FamilyIndex {
  families: Family[];
  byId: Map<string, Family>;
  /** Members matching the word exactly, or after removing an inflection. */
  lookup: (word: string) => FamilyHit[];
  /** Two different words from the same family (decide/decision, economic/economical). */
  sameFamily: (a: string, b: string) => boolean;
}

export function buildIndex(families: Family[]): FamilyIndex {
  const map = new Map<string, { family: Family; member: FamilyMember }[]>();
  for (const f of families) {
    for (const m of f.members) {
      const k = m.word.toLowerCase();
      map.set(k, [...(map.get(k) ?? []), { family: f, member: m }]);
    }
  }
  const lookup = (word: string): FamilyHit[] => {
    const w = word.trim().toLowerCase();
    const exact = map.get(w);
    if (exact) return exact.map((h) => ({ ...h, exact: true }));
    for (const l of lemmas(w).slice(1)) {
      const hit = map.get(l);
      if (hit) return hit.map((h) => ({ ...h, exact: false }));
    }
    return [];
  };
  return {
    families,
    byId: new Map(families.map((f) => [f.id, f])),
    lookup,
    sameFamily: (a, b) => {
      if (a.trim().toLowerCase() === b.trim().toLowerCase()) return false;
      const fa = new Set(lookup(a).map((h) => h.family.id));
      return lookup(b).some((h) => fa.has(h.family.id));
    },
  };
}

/** The family that best matches a saved word (exact match first). */
export function familyFor(index: FamilyIndex, word: string): Family | null {
  const hits = index.lookup(word);
  return (hits.find((h) => h.exact) ?? hits[0])?.family ?? null;
}

/**
 * If a saved word type looks wrong, return the type the family data says it is.
 * Words that are several types (increase, cost, hard…) never get a warning.
 */
export function suggestedPos(index: FamilyIndex, word: string, savedPos: string | null): FormPos | null {
  if (!savedPos || !FORM_POS.includes(savedPos as FormPos)) return null;
  const exact = index.lookup(word).filter((h) => h.exact);
  const kinds = [...new Set(exact.map((h) => h.member.pos))];
  if (kinds.length !== 1) return null;
  return kinds[0] !== savedPos ? kinds[0]! : null;
}

export type FormResult = 'correct' | 'word_form' | 'spelling' | 'other';

/** Grades a typed answer: right, another form of the same family, a spelling slip, or something else. */
export function gradeForm(index: FamilyIndex, family: Family, expected: string, typed: string): { result: FormResult; typedPos: FormPos | null } {
  const t = typed.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t === expected.trim().toLowerCase()) return { result: 'correct', typedPos: null };
  const hit = index.lookup(t).find((h) => h.family.id === family.id);
  if (hit) return { result: 'word_form', typedPos: hit.member.pos };
  if (t && spellingSimilarity(t, expected.toLowerCase()) >= 0.75) return { result: 'spelling', typedPos: null };
  return { result: 'other', typedPos: null };
}

/** Splits "We reached a [decision] today." into parts for rendering a blank. */
export function splitExample(sentence: string): { before: string; answer: string; after: string } {
  const m = /^(.*?)\[([^\]]+)\](.*)$/s.exec(sentence);
  return m ? { before: m[1]!, answer: m[2]!, after: m[3]! } : { before: sentence, answer: '', after: '' };
}

/** "Fix the error": put a different form of the family in place of the right answer. */
export function makeFixItem(family: Family, example: FamilyExample, pick = 0): { wrong: string; sentence: string } | null {
  const wrongs = family.members.filter((m) => m.pos !== example.answer_pos && m.word.toLowerCase() !== example.answer.toLowerCase());
  if (!wrongs.length) return null;
  const wrong = wrongs[pick % wrongs.length]!.word;
  const { before, after } = splitExample(example.sentence);
  const cased = /^[A-Z]/.test(example.answer) ? wrong[0]!.toUpperCase() + wrong.slice(1) : wrong;
  return { wrong: cased, sentence: `${before}${cased}${after}` };
}

/** "Complete the family": one cell given per family, the other parts of speech to fill in. */
export function makeGrid(family: Family): { given: FamilyMember; cells: { pos: FormPos; accepted: string[] }[] } {
  const given = family.members.find((m) => m.word === family.id) ?? family.members[0]!;
  const cells = FORM_POS.filter((p) => p !== given.pos)
    .map((pos) => ({ pos, accepted: family.members.filter((m) => m.pos === pos).map((m) => m.word) }))
    .filter((c) => c.accepted.length > 0);
  return { given, cells };
}

/** Words that are exactly one part of speech everywhere — safe for the quick sorting drill. */
export function sortableWords(index: FamilyIndex): FamilyMember[] {
  const seen = new Map<string, FamilyMember[]>();
  for (const f of index.families) for (const m of f.members) seen.set(m.word.toLowerCase(), [...(seen.get(m.word.toLowerCase()) ?? []), m]);
  return [...seen.values()].filter((ms) => new Set(ms.map((m) => m.pos)).size === 1).map((ms) => ms[0]!);
}

/** Deterministic shuffle (seeded) so tests and retries are reproducible. */
export function shuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
