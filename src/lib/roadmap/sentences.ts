import { splitSentences } from '@/lib/writing/analyze';

/**
 * "Viết 3–5 câu": each day of the path with active collocations has a short writing exercise — 3 to 5 sentences
 * answering that day's Writing prompt, using all 5 collocations. Kept in this browser, keyed by the day.
 */

export const MIN_SENTENCES = 3;
export const MAX_SENTENCES = 5;

export interface SentenceEntry {
  text: string;
  /** collocations the learner ticked by hand (when the automatic check misses an irregular form) */
  manual: string[];
  savedAt: string;
  passed: boolean;
}

const KEY = 'roadmap:sentences:v1';
type Store = Record<string, SentenceEntry>;

export function readSentences(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store;
  } catch {
    return {};
  }
}
export const sentencesOf = (date: string) => readSentences()[date];
export function saveSentences(date: string, entry: SentenceEntry) {
  const all = readSentences();
  all[date] = entry;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'from', 'at', 'is', 'are', 'be', 'been', 'was', 'were', 'it', 'that', 'as', 'and', 'or', 'there', 'this', 'then', 'into', 'sb', 'sth', "one's", 'oneself']);

/** Common irregular verbs in the collocations: "made up" counts for "make up". */
const IRREGULAR: Record<string, string[]> = {
  make: ['made'], take: ['took', 'taken'], bring: ['brought'], buy: ['bought'], go: ['went', 'gone'], rise: ['rose', 'risen'],
  fall: ['fell', 'fallen'], lead: ['led'], keep: ['kept'], spend: ['spent'], give: ['gave', 'given'], become: ['became'],
  grow: ['grew', 'grown'], build: ['built'], break: ['broke', 'broken'], pay: ['paid'], hold: ['held'], have: ['has', 'had'],
  do: ['did', 'done', 'does'], undergo: ['underwent', 'undergone'], overtake: ['overtook', 'overtaken'], burn: ['burnt'],
  hit: ['hit'], set: ['set'], drive: ['drove', 'driven'], seek: ['sought'], teach: ['taught'], feel: ['felt'], put: ['put'],
  pose: ['posed'], meet: ['met'], bear: ['bore', 'borne'], come: ['came'], show: ['shown'],
};

const words = (s: string) => (s.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []);

/** The part of a word that its forms share: "increase" → "increas", "studies"/"study" → "stud". */
function stem(w: string) {
  if (w.length >= 4 && w.endsWith('e')) return w.slice(0, -1);
  if (w.length <= 4) return w;
  if (w.endsWith('y')) return w.slice(0, -1);
  return w.length > 7 ? w.slice(0, w.length - 2) : w;
}

function tokenMatches(token: string, sentenceWords: string[]) {
  const forms = IRREGULAR[token] ?? [];
  const st = stem(token);
  return sentenceWords.some((w) => w === token || forms.includes(w) || (st.length >= 3 && w.startsWith(st) && w.length - st.length <= 5));
}

/** The content words of one way of saying a collocation ("double / triple" has two). */
export function contentTokens(alternative: string) {
  return words(alternative.replace(/\.\.\.|…/g, ' ')).filter((w) => !STOP.has(w));
}

/** Is the collocation used in this text? Every content word must appear, in the same sentence, in some form. */
export function usesPhrase(text: string, phrase: string): boolean {
  const alternatives = phrase.split(/\s+\/\s+/);
  const sentences = splitSentences(text, 'en').map(words);
  return alternatives.some((alt) => {
    const tokens = contentTokens(alt);
    if (!tokens.length) return text.toLowerCase().includes(alt.toLowerCase().trim());
    return sentences.some((sw) => tokens.every((t) => tokenMatches(t, sw)));
  });
}

export interface SentenceCheck {
  sentences: string[];
  used: Record<string, boolean>;
  usedCount: number;
  enoughSentences: boolean;
  tooMany: boolean;
  passed: boolean;
}

export function checkSentences(text: string, phrases: string[], manual: string[] = []): SentenceCheck {
  const sentences = splitSentences(text, 'en');
  const used = Object.fromEntries(phrases.map((p) => [p, manual.includes(p) || usesPhrase(text, p)]));
  const usedCount = Object.values(used).filter(Boolean).length;
  const enoughSentences = sentences.length >= MIN_SENTENCES;
  const tooMany = sentences.length > MAX_SENTENCES;
  return { sentences, used, usedCount, enoughSentences, tooMany, passed: enoughSentences && !tooMany && usedCount === phrases.length };
}
