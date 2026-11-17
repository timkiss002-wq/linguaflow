import weeksJson from '../../../content/roadmap/writing-weeks.json';
import { usesWord, type WriteItem } from '@/lib/practice/items';
import { ACTIVE_TOPICS, type ActiveTopic } from './plan';

/**
 * "Writing tuần": every week of the path with active collocations has one Writing topic. The learner first drills the
 * week's word forms (gap-fill), then translates a model paragraph sentence by sentence — every sentence uses only the
 * collocations, word forms and extra words learned so far — then writes a paragraph alone on a second prompt.
 * Content: content/roadmap/writing-weeks.txt → writing-weeks.json.
 */

export interface FormWord {
  w: string;
  pos: string;
  m: string;
}
export interface Family {
  head: string;
  words: FormWord[];
  gaps: { s: string; a: string[]; why: string }[];
}
export interface BankItem {
  type: string;
  term: string;
  m: string;
  ex: string;
}
export interface WritingWeek {
  week: number;
  topic: string;
  title: string;
  prompt: string;
  prompt_vi: string;
  own: string;
  own_vi: string;
  forms: Family[];
  bank: BankItem[];
  paragraph: { vi: string; en: string[]; use: string; hint: string }[];
}

export const WRITING_WEEKS = (weeksJson as { weeks: WritingWeek[] }).weeks;
export const writingWeek = (n: number) => WRITING_WEEKS.find((w) => w.week === n);

/** Week 12 stops on Wednesday (Tết): only the first 15 collocations of its topic are learned. */
export const LEARNED_PER_WEEK: Record<number, number> = { 12: 15 };

/** The collocations of the week's topic learned by the end of that week. */
export function weekCollocations(w: WritingWeek): ActiveTopic['words'] {
  const topic = ACTIVE_TOPICS.find((t) => t.id === w.topic);
  return topic ? topic.words.slice(0, LEARNED_PER_WEEK[w.week] ?? topic.words.length) : [];
}

/** "Word form tuần": two gap sentences per family, the head word given. Strict: the form is what is trained. */
export function gapItems(w: WritingWeek): WriteItem[] {
  return w.forms.flatMap((f) =>
    f.gaps.map((g, i) => ({
      key: `${f.head}:${i}`,
      prompt: `${g.s} (${f.head})`,
      en: g.a,
      why: g.why,
      label: f.head,
      hint: f.words.map((x) => `${x.w} (${x.pos})`).join(' · '),
    })),
  );
}

/** The model paragraph, one sentence at a time, Vietnamese → English with the word it must use. */
export function paragraphItems(w: WritingWeek): WriteItem[] {
  return w.paragraph.map((s, i) => ({ key: `p${i}`, prompt: s.vi, en: s.en, mustUse: s.use, hint: s.hint, label: `Câu ${i + 1}` }));
}

/** Everything the week's writing may draw on, for the checklist of the learner's own paragraph. */
export function writingTargets(w: WritingWeek): { term: string; kind: 'Collocation' | 'Word form' | 'Từ bổ sung' }[] {
  const out: { term: string; kind: 'Collocation' | 'Word form' | 'Từ bổ sung' }[] = [];
  for (const c of weekCollocations(w)) out.push({ term: c.t, kind: 'Collocation' });
  for (const f of w.forms) for (const x of f.words) out.push({ term: x.w, kind: 'Word form' });
  for (const b of w.bank) if (!b.term.startsWith('(')) out.push({ term: b.term.replace(/\s*\([^)]*\)$/, '').split(' / ')[0]!, kind: 'Từ bổ sung' });
  return out;
}

/** Which targets a text uses (collocations and extra words in any form; word forms only as the exact word). */
export function usedTargets(text: string, w: WritingWeek) {
  const words = new Set(text.toLowerCase().match(/[a-z]+(?:[-'][a-z]+)*/g) ?? []);
  return writingTargets(w).filter((t) => (t.kind === 'Word form' ? words.has(t.term.toLowerCase()) || words.has(`${t.term.toLowerCase()}s`) : usesWord(text, t.term)));
}

export const countWords = (text: string) => (text.trim().match(/\S+/g) ?? []).length;
export const OWN_MIN_WORDS = 120;
/** The own paragraph counts as written with ≥ 120 words and ≥ 6 of the week's targets. */
export const OWN_MIN_TARGETS = 6;

export interface OwnWriting {
  text: string;
  savedAt: string;
}
const KEY = 'roadmap:own-writing:v1';
export function readOwn(): Record<string, OwnWriting> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, OwnWriting>;
  } catch {
    return {};
  }
}
export const ownOf = (taskId: string) => readOwn()[taskId];
export function saveOwn(taskId: string, text: string) {
  const all = readOwn();
  all[taskId] = { text, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
