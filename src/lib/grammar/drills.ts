import data from '../../../content/grammar-drills.json';
import type { CompareResult } from '@/lib/compare';
import { compareEnglish } from '@/lib/compare/english';

/** Translation drills built around one grammar point each (Vietnamese → English), for learners around band 4.5–5.5. */

export type DiagramKind = 'habit' | 'past' | 'perfect' | 'future' | 'compare' | 'passive' | 'relative' | 'conditional' | 'modal' | 'linking' | 'trend' | 'nouns' | 'agreement' | 'pattern' | 'order';

export interface DrillItem {
  vi: string;
  /** a few emoji drawn as a little picture of the sentence */
  scene: string;
  /** key words / structure, shown on request */
  hint: string;
  /** accepted translations; contractions need not be listed (don't = do not) */
  en: string[];
}

/** A recognition question (step 2 of a topic): pick the right form before producing it. */
export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  why_vi: string;
}

export interface GrammarTopic {
  id: string;
  title_vi: string;
  title_en: string;
  band: string;
  diagram: DiagramKind;
  summary_vi: string;
  formula: string[];
  tips_vi: string[];
  examples: { en: string; vi: string }[];
  items: DrillItem[];
  quiz?: QuizItem[];
}

export const TOPICS = data.topics as GrammarTopic[];
export const topicById = (id: string) => TOPICS.find((t) => t.id === id);

/** don't → do not, I'm → I am, it's → it is… so either form of an answer is accepted. */
export function expandContractions(s: string): string {
  return s
    .replace(/[’‘`´]/g, "'")
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/\bcan't\b/gi, 'can not')
    .replace(/\bcannot\b/gi, 'can not')
    .replace(/\bshan't\b/gi, 'shall not')
    .replace(/n't\b/gi, ' not')
    .replace(/\b(i)'m\b/gi, '$1 am')
    .replace(/'re\b/gi, ' are')
    .replace(/'ve\b/gi, ' have')
    .replace(/'ll\b/gi, ' will')
    .replace(/'d\b/gi, ' would')
    .replace(/\b(it|he|she|that|there|what|here|who|where|how)'s\b/gi, '$1 is');
}

export type Verdict = 'correct' | 'spelling' | 'wrong';

export interface Checked {
  verdict: Verdict;
  /** the accepted answer closest to what was typed */
  closest: string;
  diff: CompareResult;
}

/** Compare a translation with every accepted answer; keep the closest. Punctuation and capitals don't count. */
export function checkTranslation(item: DrillItem, typed: string): Checked {
  const mine = expandContractions(typed);
  let best: Checked | null = null;
  for (const answer of item.en) {
    const diff = compareEnglish(expandContractions(answer), mine, { ignorePunctuation: true });
    const onlySpelling = !diff.isCorrect && Object.entries(diff.counts).every(([k, v]) => v === 0 || k === 'misspelled' || k === 'punctuation');
    const verdict: Verdict = diff.isCorrect ? 'correct' : onlySpelling ? 'spelling' : 'wrong';
    const c = { verdict, closest: answer, diff };
    if (verdict === 'correct') return c;
    if (!best || rank(c) > rank(best)) best = c;
  }
  return best!;
}
const rank = (c: Checked) => (c.verdict === 'spelling' ? 1000 : 0) + c.diff.accuracy;

/** Best score per topic, kept in this browser. */
export interface TopicProgress {
  best: number;
  total: number;
  at: string;
}
const KEY = 'grammar:progress';
export function readProgress(): Record<string, TopicProgress> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, TopicProgress>;
  } catch {
    return {};
  }
}
export function saveProgress(topic: string, score: number, total: number) {
  const all = readProgress();
  if (all[topic] && all[topic].best >= score) return;
  all[topic] = { best: score, total, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

/** Pass mark for both steps of a topic on the learning path. */
export const PASS = 0.8;

/** Best recognition-quiz score per topic, kept in this browser. */
const QUIZ_KEY = 'grammar:quiz';
export function readQuiz(): Record<string, TopicProgress> {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_KEY) ?? '{}') as Record<string, TopicProgress>;
  } catch {
    return {};
  }
}
export function saveQuiz(topic: string, score: number, total: number) {
  const all = readQuiz();
  if (all[topic] && all[topic].best >= score) return;
  all[topic] = { best: score, total, at: new Date().toISOString() };
  try {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
