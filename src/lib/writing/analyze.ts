/**
 * Writing analysis without AI (P5): counts, sentence length, variety, linking words, target words, HSK levels of the
 * words used (Chinese), and simple, reliable checks. Every number is something the learner can verify in their text.
 */
import { EN_FUNCTION_WORDS } from '@/lib/personal/insights';
import { splitWords } from '@/lib/vocab/words';
import type { GuidedRecord } from './guided';

export type Lang = 'en' | 'zh';
export type TaskKind = 'sentences' | 'paragraph' | 'letter' | 'essay';

export interface Issue {
  code: string;
  message: string;
  /** Short quotes from the text that show the problem. */
  samples?: string[];
}

export interface Metrics {
  language: Lang;
  /** words (en) or Chinese characters (zh) */
  length: number;
  minLength: number;
  sentences: number;
  paragraphs: number;
  avgSentence: number;
  longestSentence: number;
  /** distinct content words / content words, in % (higher = more varied vocabulary) */
  variety: number;
  linkers: { category: string; text: string }[];
  targetUsed: string[];
  targetMissing: string[];
  repeated: { word: string; count: number }[];
  /** zh: HSK 2.0 level of each distinct word used (0 = not in the HSK list) */
  hskLevels?: Record<string, number>;
  /** zh: distinct words above the learner's level */
  aboveLevel?: string[];
  issues: Issue[];
  /** words or characters per minute, when the time is known */
  speed?: number;
  /** set when the text was written in the guided IELTS mode (sentence by sentence from a frame) */
  guided?: GuidedRecord;
  /** set when the text was written under exam conditions (timed, no help) */
  exam?: { minutes: number; timeUp: boolean };
}

/* ───────────── linking words ───────────── */

const EN_LINKERS: Record<string, string[]> = {
  addition: ['moreover', 'furthermore', 'in addition', 'besides', 'also', 'what is more'],
  contrast: ['however', 'although', 'even though', 'whereas', 'nevertheless', 'on the other hand', 'on the contrary', 'despite', 'in spite of', 'but'],
  cause: ['because', 'because of', 'due to', 'since', 'as a result of', 'owing to'],
  result: ['therefore', 'thus', 'as a result', 'consequently', 'hence', 'so that'],
  example: ['for example', 'for instance', 'such as', 'in particular'],
  sequence: ['firstly', 'first of all', 'secondly', 'thirdly', 'then', 'finally', 'lastly', 'after that'],
  opinion: ['in my opinion', 'i believe', 'i think', 'from my perspective', 'personally', 'in my view'],
  conclusion: ['in conclusion', 'to sum up', 'overall', 'in summary', 'to conclude', 'all in all'],
};
const ZH_LINKERS: Record<string, string[]> = {
  addition: ['而且', '另外', '此外', '并且', '还有', '不但…而且', '不仅…也', '不仅…还', '既…又'],
  contrast: ['但是', '可是', '不过', '然而', '却', '虽然…但是', '虽然…可是', '虽然…还是', '尽管…但是'],
  cause: ['因为', '由于', '因为…所以'],
  result: ['所以', '因此', '于是', '因而'],
  condition: ['如果…就', '只要…就', '即使…也', '无论…都', '不管…都', '只有…才'],
  example: ['比如', '例如'],
  sequence: ['首先', '其次', '然后', '接着', '最后', '一边…一边'],
  opinion: ['我认为', '我觉得', '在我看来'],
  conclusion: ['总之', '总的来说', '总而言之', '综上所述'],
};

function findLinkers(text: string, lang: Lang): { category: string; text: string }[] {
  const out: { category: string; text: string }[] = [];
  const lower = text.toLowerCase();
  const table = lang === 'en' ? EN_LINKERS : ZH_LINKERS;
  for (const [category, list] of Object.entries(table)) {
    // longer phrases first, so "because of" is not also counted as "because"
    for (const l of [...list].sort((a, b) => b.length - a.length)) {
      let hit = false;
      if (lang === 'en') hit = new RegExp(`\\b${l.replace(/ /g, '\\s+')}\\b`).test(lower);
      else if (l.includes('…')) {
        const [a, b] = l.split('…');
        const i = text.indexOf(a!);
        hit = i >= 0 && text.indexOf(b!, i + a!.length) > i;
      } else hit = text.includes(l);
      // already counted as part of a longer phrase or a pair ("because of", "因为…所以")?
      const inside = (found: string) =>
        found.split('…').some((part) => (lang === 'en' ? new RegExp(`\\b${l}\\b`).test(part) : l.split('…').some((lp) => part.includes(lp))));
      if (hit && !out.some((o) => inside(o.text))) out.push({ category, text: l });
    }
  }
  return out;
}

/* ───────────── helpers ───────────── */

export function splitSentences(text: string, lang: Lang): string[] {
  const re = lang === 'zh' ? /[^。！？!?\n]+[。！？!?]*/g : /[^.!?\n]+[.!?]*/g;
  return (text.match(re) ?? []).map((s) => s.trim()).filter((s) => (lang === 'zh' ? /\p{Script=Han}/u.test(s) : /\p{L}/u.test(s)));
}

const enWords = (text: string) => splitWords(text, 'en').filter((s) => s.isWord).map((s) => s.text);
const hanCount = (text: string) => (text.match(/\p{Script=Han}/gu) ?? []).length;

/** "studies" / "studied" / "studying" count as using "study". */
export function usesWord(text: string, target: string, lang: Lang): boolean {
  if (lang === 'zh') return text.includes(target);
  const t = target.toLowerCase();
  const forms = new Set([t, `${t}s`, `${t}es`, `${t}ed`, `${t}d`, `${t}ing`, `${t}ly`]);
  if (t.endsWith('y')) ['ies', 'ied'].forEach((e) => forms.add(t.slice(0, -1) + e));
  if (t.endsWith('e')) forms.add(`${t.slice(0, -1)}ing`);
  if (t.includes(' ')) return text.toLowerCase().includes(t);
  return enWords(text).some((w) => forms.has(w.toLowerCase()));
}

const ZH_COMMON = new Set(['我', '你', '他', '她', '它', '我们', '你们', '他们', '的', '了', '是', '在', '有', '也', '和', '很', '都', '就', '不', '这', '那', '一个', '会', '要', '说', '着', '过', '吗', '呢', '吧', '得', '地', '还', '让', '给', '对', '把', '被']);
const CONTRACTION = /\b(?:\w+n't|it's|that's|there's|what's|i'm|you're|we're|they're|i've|you've|we've|they've|i'll|you'll|we'll|they'll|i'd|you'd|he's|she's|let's)\b/gi;
const quote = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* ───────────── analysis ───────────── */

export interface AnalyzeOptions {
  language: Lang;
  kind: TaskKind;
  minLength: number;
  targets: string[];
  /** zh: word → HSK 2.0 level (missing = not in the list) */
  hsk?: Map<string, number>;
  /** learner level 1–6, for "words above your level" */
  level?: number;
  seconds?: number;
}

export function analyze(text: string, o: AnalyzeOptions): Metrics {
  const lang = o.language;
  const sentences = splitSentences(text, lang);
  const paragraphs = text.split(/\n\s*\n|\n/).filter((p) => p.trim()).length;
  const sentLen = sentences.map((s) => (lang === 'zh' ? hanCount(s) : enWords(s).length));
  const length = lang === 'zh' ? hanCount(text) : enWords(text).length;
  const issues: Issue[] = [];

  // content words for variety / repetition
  const words =
    lang === 'zh'
      ? splitWords(text, 'zh').filter((s) => s.isWord && /\p{Script=Han}/u.test(s.text)).map((s) => s.text)
      : enWords(text).map((w) => w.toLowerCase());
  const content = words.filter((w) => (lang === 'zh' ? !ZH_COMMON.has(w) && [...w].length >= 2 : !EN_FUNCTION_WORDS.has(w) && w.length > 2));
  const counts = new Map<string, number>();
  for (const w of content) counts.set(w, (counts.get(w) ?? 0) + 1);
  const variety = content.length ? Math.round((counts.size / content.length) * 100) : 0;
  const repeatMin = Math.max(4, Math.ceil(content.length * 0.04));
  const repeated = [...counts.entries()]
    .filter(([w, n]) => n >= repeatMin && !o.targets.some((t) => t.toLowerCase() === w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const targetUsed = o.targets.filter((t) => usesWord(text, t, lang));
  const targetMissing = o.targets.filter((t) => !targetUsed.includes(t));
  const linkers = findLinkers(text, lang);
  const formal = o.kind === 'essay' || o.kind === 'letter';

  // ── checks ──
  if (length < o.minLength) issues.push({ code: 'short', message: `${length} ${lang === 'zh' ? 'characters' : 'words'} — the task asks for at least ${o.minLength}.` });
  if (o.kind === 'sentences' && sentences.length < o.targets.length) issues.push({ code: 'sentences', message: `Write one sentence for each word: ${o.targets.length} words, ${sentences.length} sentences.` });
  if (targetMissing.length) issues.push({ code: 'targets', message: `Not used yet: ${targetMissing.join(', ')}.` });
  if (repeated.length) issues.push({ code: 'repetition', message: 'Some words are repeated a lot — try a synonym or a pronoun.', samples: repeated.map((r) => `${r.word} ×${r.count}`) });

  if (lang === 'en') {
    const long = sentences.filter((_, i) => sentLen[i]! > 35);
    if (long.length) issues.push({ code: 'long-sentence', message: 'Very long sentences (35+ words) are hard to follow. Split them.', samples: long.map((s) => quote(s)) });
    const lowerStart = sentences.filter((s) => /^[a-z]/.test(s));
    if (lowerStart.length) issues.push({ code: 'capital', message: 'Start every sentence with a capital letter.', samples: lowerStart.map((s) => quote(s, 25)) });
    if (/(^|[^\p{L}'])i([^\p{L}']|$)/u.test(text)) issues.push({ code: 'lowercase-i', message: 'Write "I" as a capital letter.' });
    if (/\s[,.;:!?]/.test(text) || /[,;:][^\s\d"')]/.test(text) || /[a-z]\.[A-Z]/.test(text)) issues.push({ code: 'spacing', message: 'Put a space after commas and full stops, but not before them.' });
    if (formal) {
      const c = text.match(CONTRACTION) ?? [];
      if (c.length) issues.push({ code: 'contractions', message: 'Formal writing avoids contractions: write "do not", "it is".', samples: [...new Set(c.map((x) => x.toLowerCase()))].slice(0, 5) });
      const informal = sentences.filter((s) => /^(and|but|so)\b/i.test(s));
      if (informal.length) issues.push({ code: 'informal-start', message: 'In formal writing, avoid starting sentences with And / But / So — use Moreover / However / Therefore.', samples: informal.map((s) => quote(s, 25)) });
    }
    const very = (text.match(/\bvery\b/gi) ?? []).length;
    if (very >= 3) issues.push({ code: 'very', message: `"very" ×${very} — stronger words are more precise (very big → huge, very important → essential).` });
    if (o.kind === 'essay') {
      if (length >= 150 && paragraphs < 3) issues.push({ code: 'paragraphs', message: 'An essay needs paragraphs: introduction, 2 body paragraphs, conclusion.' });
      if (!linkers.some((l) => l.category === 'conclusion')) issues.push({ code: 'conclusion', message: 'No clear conclusion — start the last paragraph with "In conclusion" or "Overall".' });
    }
  } else {
    const half = text.match(/[\p{Script=Han}][,.?!;:]|[,.?!;:][\p{Script=Han}]/gu) ?? [];
    if (half.length) issues.push({ code: 'punctuation', message: 'Use Chinese punctuation: ，。？！ instead of , . ? !', samples: half.slice(0, 4) });
    if (/[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]{2,}/.test(text)) issues.push({ code: 'latin', message: 'Write characters, not pinyin or Latin letters.' });
    if (/\p{Script=Han}[ \u3000]+\p{Script=Han}/u.test(text)) issues.push({ code: 'spaces', message: 'Chinese has no spaces between words.' });
    const long = sentences.filter((s) => hanCount(s) > 40 && !/[，、；]/.test(s));
    if (long.length) issues.push({ code: 'long-sentence', message: 'Long sentence without a comma — add ，to separate the parts.', samples: long.map((s) => quote(s, 20)) });
    const woStart = sentences.filter((s) => s.startsWith('我'));
    if (sentences.length >= 4 && woStart.length / sentences.length > 0.5) issues.push({ code: 'wo-start', message: `${woStart.length} of ${sentences.length} sentences start with 我. Start some with a time (上个周末…), a place or a linking word.` });
    if (length >= 60 && linkers.length === 0) issues.push({ code: 'no-linkers', message: 'No linking words yet — try 因为…所以, 虽然…但是, 首先…然后.' });
  }

  let hskLevels: Record<string, number> | undefined;
  let aboveLevel: string[] | undefined;
  if (lang === 'zh' && o.hsk) {
    hskLevels = {};
    for (const w of new Set(words)) hskLevels[w] = o.hsk.get(w) ?? 0;
    if (o.level) aboveLevel = Object.entries(hskLevels).filter(([, l]) => l > o.level!).map(([w]) => w);
  }

  return {
    language: lang,
    length,
    minLength: o.minLength,
    sentences: sentences.length,
    paragraphs,
    avgSentence: sentences.length ? Math.round((sentLen.reduce((a, b) => a + b, 0) / sentences.length) * 10) / 10 : 0,
    longestSentence: Math.max(0, ...sentLen),
    variety,
    linkers,
    targetUsed,
    targetMissing,
    repeated,
    hskLevels,
    aboveLevel,
    issues,
    speed: o.seconds && o.seconds >= 30 ? Math.round((length / o.seconds) * 60 * 10) / 10 : undefined,
  };
}

/** Distinct words per HSK level (0 = not in the list), for the bar chart. */
export function levelCounts(m: Metrics): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const l of Object.values(m.hskLevels ?? {})) out[Math.min(6, Math.max(0, l))]! += 1;
  return out;
}

/** Spans to highlight in the text: target words and linking words. */
export function highlights(text: string, lang: Lang, targets: string[], linkers: { text: string }[]): { start: number; end: number; kind: 'target' | 'linker' }[] {
  const spans: { start: number; end: number; kind: 'target' | 'linker' }[] = [];
  const add = (needle: string, kind: 'target' | 'linker') => {
    const re =
      lang === 'en'
        ? new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}${kind === 'target' ? '\\w*' : ''}\\b`, 'gi')
        : new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    for (const m of text.matchAll(re)) {
      const s = { start: m.index!, end: m.index! + m[0].length, kind };
      if (!spans.some((x) => s.start < x.end && x.start < s.end)) spans.push(s);
    }
  };
  targets.forEach((t) => add(t, 'target'));
  linkers.flatMap((l) => l.text.split('…')).forEach((t) => add(t, 'linker'));
  return spans.sort((a, b) => a.start - b.start);
}
