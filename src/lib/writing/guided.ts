/**
 * Guided IELTS Task 2 writing: one fixed frame per question type, model essays at bands 5.5 / 6.5 / 7.5 with a
 * Vietnamese version of every sentence. The learner translates sentence by sentence; each answer is checked against
 * the frame (fixed phrases) and the model sentences. Pure, no I/O. Content: content/ielts-guided/*.json.
 */
import { spellingSimilarity } from '@/lib/compare/align';
import { compareEnglish, tokenizeEnglish } from '@/lib/compare/english';
import type { CompareResult } from '@/lib/compare';
import advantagesJson from '../../../content/ielts-guided/advantages.json';
import agreeJson from '../../../content/ielts-guided/agree.json';
import discussJson from '../../../content/ielts-guided/discuss.json';
import framesJson from '../../../content/ielts-guided/frames.json';
import problemJson from '../../../content/ielts-guided/problem.json';
import task1Json from '../../../content/ielts-guided/task1.json';
import twopartJson from '../../../content/ielts-guided/twopart.json';

export const BANDS = ['5.5', '6.5', '7.5'] as const;
export type Band = (typeof BANDS)[number];
export const isBand = (v: unknown): v is Band => BANDS.includes(v as Band);

/**
 * How much help the learner gets:
 * 0 = learn the frame (type only the fixed phrases), 1 = Vietnamese + template + key words,
 * 2 = Vietnamese + what the sentence does, 3 = Vietnamese only. (Writing the whole essay alone is the normal editor.)
 */
export const LEVELS = [0, 1, 2, 3] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_INFO: Record<Level, { name: string; vi: string }> = {
  0: { name: 'Learn the frame', vi: 'Học thuộc khung: gõ lại các cụm cố định của từng câu' },
  1: { name: 'Frame + hints', vi: 'Câu tiếng Việt + khung câu có chỗ trống + từ gợi ý' },
  2: { name: 'Sentence role only', vi: 'Câu tiếng Việt + chức năng của câu (không có khung)' },
  3: { name: 'Vietnamese only', vi: 'Chỉ có câu tiếng Việt — tự nhớ khung' },
};

export interface FrameSlot {
  id: string;
  /** paragraph 1-4 */
  p: number;
  role: string;
  role_vi: string;
  /** template, ___ = the learner's content */
  t: string;
  /** phrases that must appear; each inner list = alternatives */
  fixed: string[][];
}
/** The figure of an IELTS Academic Task 1 prompt. */
export type ChartSpec =
  | { kind: 'line'; title: string; unit: string; x: string[]; series: { name: string; values: number[] }[] }
  | { kind: 'bar'; title: string; unit: string; categories: string[]; series: { name: string; values: number[] }[] }
  | { kind: 'pie'; title: string; unit: string; pies: { label: string; slices: { name: string; value: number }[] }[] }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][] }
  | { kind: 'process'; title: string; steps: string[] }
  | { kind: 'map'; title: string; maps: { label: string; features: MapFeature[] }[] };

/**
 * One area on a Task 1 map, on a 100 × 70 grid (x east, y south; north is up). Roads and bridges are thin rectangles.
 * lx / ly move the label when it does not fit inside the shape.
 */
export interface MapFeature {
  name: string;
  kind: 'building' | 'field' | 'green' | 'water' | 'road' | 'paved';
  x: number;
  y: number;
  w: number;
  h: number;
  lx?: number;
  ly?: number;
}

/** Where a map feature lies, in the words a Task 1 answer uses ("north-west", "centre", "runs east–west"). */
export function mapPosition(f: MapFeature): string {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const ns = cy < 25 ? 'north' : cy > 34 ? 'south' : '';
  const ew = cx < 35 ? 'west' : cx > 65 ? 'east' : '';
  if (f.w >= 90) return ns ? `along the ${ns}ern edge` : 'east–west across the centre';
  if (f.w >= f.h * 5) return 'runs east–west';
  if (f.h >= f.w * 5) return ew ? `runs north–south in the ${ew}` : 'runs north–south';
  return ns && ew ? `${ns}-${ew}` : ns || ew || 'centre';
}

export interface GuidedType {
  id: string;
  /** IELTS Writing Task 1 (describe a figure, 150 words) or Task 2 (essay, 250 words) */
  task: 1 | 2;
  /** names of the four paragraphs, when they differ from introduction / body / body / conclusion */
  paras?: string[];
  name: string;
  name_vi: string;
  spot: string;
  plan_vi: string;
  frame: FrameSlot[];
}
export interface GuidedSentence {
  slot: string;
  vi: string;
  en: Record<Band, string>;
}
export interface GuidedPrompt {
  id: string;
  type: string;
  /** writing_tasks id: the essay is saved against it, so analysis and AI feedback treat it as an IELTS essay */
  task: string;
  title: string;
  prompt: string;
  prompt_vi: string;
  ideas_vi: string[];
  /** Task 1: the figure to describe */
  chart?: ChartSpec;
  sentences: GuidedSentence[];
}

type RawPrompt = Omit<GuidedPrompt, 'sentences'> & { sentences: string[][] };

function toPrompt(raw: RawPrompt): GuidedPrompt {
  return {
    ...raw,
    sentences: raw.sentences.map(([slot = '', vi = '', b55 = '', b65 = '', b75 = '']) => ({ slot, vi, en: { '5.5': b55, '6.5': b65, '7.5': b75 } })),
  };
}

export const GUIDED_TYPES: GuidedType[] = framesJson.types as GuidedType[];
export const GUIDED_PROMPTS: GuidedPrompt[] = [task1Json, agreeJson, discussJson, advantagesJson, problemJson, twopartJson].flatMap((f) => (f.prompts as unknown as RawPrompt[]).map(toPrompt));

/** Minimum words and exam minutes of an IELTS writing task. */
export const TASK_RULES = { 1: { words: 150, minutes: 20 }, 2: { words: 250, minutes: 40 } } as const;

/** The guided prompt written for a writing task (to show its figure), if any. */
export const guidedForTask = (taskId: string) => GUIDED_PROMPTS.find((p) => p.task === taskId);

/** The figure as text, appended to Task 1 prompts so the AI marking the essay knows the data. */
export function chartDataText(c: ChartSpec): string {
  switch (c.kind) {
    case 'line':
      return `${c.series.map((s) => `${s.name}: ${s.values.map((v, i) => `${c.x[i]} ${v}`).join(', ')}`).join('; ')} (${c.unit})`;
    case 'bar':
      return c.unit === '%'
        ? c.series.map((s) => `${s.name}: ${s.values.map((v, i) => `${c.categories[i]} ${v}%`).join(', ')}`).join('; ')
        : `${c.series.map((s) => `${s.name}: ${s.values.map((v, i) => `${c.categories[i]} ${v}`).join(', ')}`).join('; ')} (${c.unit})`;
    case 'pie':
      return c.pies.map((p) => `${p.label}: ${p.slices.map((s) => `${s.name} ${s.value}%`).join(', ')}`).join('; ');
    case 'table':
      return `${c.columns.join(' | ')} — ${c.rows.map((r) => r.join(', ')).join('; ')}`;
    case 'process':
      return c.steps.map((s, i) => `(${i + 1}) ${s}`).join(' → ');
    case 'map':
      return c.maps.map((m) => `${m.label}: ${m.features.map((f) => `${f.name} (${mapPosition(f)})`).join(', ')}`).join('; ');
  }
}

/** The full prompt of a guided prompt, as stored with the essay (Task 1: with the figure's data for the AI). */
export const promptWithData = (p: GuidedPrompt) => (p.chart ? `${p.prompt}\n\n[Chart data] ${chartDataText(p.chart)}` : p.prompt);

/** A writing task's prompt without the chart data appended for the AI (the learner sees the figure instead). */
export const visiblePrompt = (prompt: string) => prompt.split('\n\n[Chart data]')[0]!.trim();

export const guidedType = (id: string) => GUIDED_TYPES.find((t) => t.id === id);
export const guidedPrompt = (id: string) => GUIDED_PROMPTS.find((p) => p.id === id);
export const slotOf = (type: GuidedType, slotId: string) => type.frame.find((s) => s.id === slotId);

/* ───────────── checking ───────────── */

const words = (text: string) =>
  tokenizeEnglish(text)
    .filter((t) => !t.punct)
    .map((t) => t.norm.replace(/’/g, "'"));

const close = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && spellingSimilarity(a, b) >= 0.8);

/** Where `phrase` appears in `text` (word by word, case and punctuation ignored, small typos allowed). */
export function findPhrase(text: string, phrase: string): { found: boolean; typo: boolean } {
  const hay = words(text);
  const needle = words(phrase);
  if (!needle.length) return { found: true, typo: false };
  let best: { found: boolean; typo: boolean } = { found: false, typo: false };
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let typo = false;
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      const h = hay[i + j]!;
      const n = needle[j]!;
      if (h === n) continue;
      if (close(h, n)) typo = true;
      else {
        ok = false;
        break;
      }
    }
    if (ok && !typo) return { found: true, typo: false };
    if (ok) best = { found: true, typo: true };
  }
  return best;
}

export interface FrameCheck {
  /** the phrase to show: the alternative that was used, else the first one */
  phrase: string;
  found: boolean;
  typo: boolean;
}

export function checkFrame(text: string, slot: FrameSlot): FrameCheck[] {
  return slot.fixed.map((alts) => {
    let typoHit: FrameCheck | null = null;
    for (const alt of alts) {
      const r = findPhrase(text, alt);
      if (r.found && !r.typo) return { phrase: alt, found: true, typo: false };
      if (r.found && !typoHit) typoHit = { phrase: alt, found: true, typo: true };
    }
    return typoHit ?? { phrase: alts[0] ?? '', found: false, typo: false };
  });
}

const STOP = new Set(
  'a an the and or but so to of in on at for from by with as is are was were be been being am it its this that these those there their they them he she his her we our you your i my me not no do does did have has had will would can could should may might must than then very more most less much many some any each every other others such also just only own one two first which who whom what when where why how if while because into about over after before up out off all both too again further once here same few'.split(' '),
);

/** Content words of the model sentence that are not part of the frame — the "meaning" of the sentence. */
export function keyWords(sentence: string, slot: FrameSlot): string[] {
  const frame = new Set(slot.fixed.flat().flatMap(words));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words(sentence)) {
    if (STOP.has(w) || frame.has(w) || w.length < 3 || /^\d/.test(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/** A few key words to help at level 1, longest first (not in sentence order, so they don't give the sentence away). */
export function hintWords(sentence: string, slot: FrameSlot, max = 4): string[] {
  return [...keyWords(sentence, slot)].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, max).sort();
}

/** Same word or a simple inflection of it (study / studies / studied, cheap / cheaper). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const stem = (w: string) => w.replace(/(ies|ied)$/, 'y').replace(/(ing|ers|est|ed|er|es|s)$/, '');
  return a.length > 3 && b.length > 3 && stem(a) === stem(b);
}

export type Verdict = 'great' | 'good' | 'different' | 'frame';

export interface SentenceCheck {
  frame: FrameCheck[];
  frameOk: boolean;
  /** word-by-word comparison with the closest model sentence */
  diff: CompareResult;
  /** 0-100: how close the answer is to the closest model sentence (any band) */
  accuracy: number;
  /** the band whose model sentence is closest */
  closest: Band;
  /** 0-100: how close the answer is to the model at the learner's target band */
  targetAccuracy: number;
  /** key words shared by all model sentences (the core meaning) that the learner did not use */
  missing: string[];
  /** small form checks, in Vietnamese */
  notes: string[];
  verdict: Verdict;
}

export function checkSentence(answer: string, sentence: GuidedSentence, slot: FrameSlot, band: Band): SentenceCheck {
  const frame = checkFrame(answer, slot);
  const frameOk = frame.every((f) => f.found);
  const byBand = BANDS.map((b) => ({ band: b, r: compareEnglish(sentence.en[b], answer, { ignorePunctuation: true }) }));
  const best = byBand.reduce((a, b) => (b.r.accuracy > a.r.accuracy ? b : a));
  const target = byBand.find((x) => x.band === band)!;

  const mine = words(answer);
  // key words that every band's model uses = the core meaning; synonyms that only one band uses are not "missing"
  const [first, ...rest] = BANDS.map((b) => keyWords(sentence.en[b], slot));
  const core = (first ?? []).filter((k) => rest.every((ws) => ws.some((w) => sameWord(w, k))));
  const missing = core.filter((k) => !mine.some((w) => sameWord(w, k)));

  const notes: string[] = [];
  const trimmed = answer.trim();
  if (/^[a-z]/.test(trimmed)) notes.push('Viết hoa chữ cái đầu câu.');
  if (trimmed && !/[.!?]["')]?$/.test(trimmed)) notes.push('Kết thúc câu bằng dấu chấm.');
  if (/\bi\b/.test(trimmed)) notes.push('Chữ “I” (tôi) luôn viết hoa.');
  if (/\b(don't|can't|won't|isn't|aren't|doesn't|didn't|it's|they're|we're)\b/i.test(trimmed)) notes.push('Bài luận IELTS không nên viết tắt (don’t → do not).');
  const refLen = words(sentence.en[best.band]).length;
  if (mine.length > 0 && mine.length < refLen * 0.6) notes.push('Câu ngắn hơn nhiều so với câu mẫu — có thể bạn đã bỏ sót ý.');

  const verdict: Verdict = !frameOk ? 'frame' : best.r.accuracy >= 85 ? 'great' : best.r.accuracy >= 55 ? 'good' : 'different';
  return { frame, frameOk, diff: best.r, accuracy: best.r.accuracy, closest: best.band, targetAccuracy: target.r.accuracy, missing: missing.slice(0, 6), notes, verdict };
}

/** Level 0: only the fixed phrases count. */
export function checkFrameOnly(answer: string, slot: FrameSlot): { frame: FrameCheck[]; ok: boolean } {
  const frame = checkFrame(answer, slot);
  return { frame, ok: frame.every((f) => f.found && !f.typo) };
}

/** The template with every fixed phrase replaced by a blank (for the frame drill). */
export function blankTemplate(slot: FrameSlot): string {
  let out = slot.t;
  for (const alts of slot.fixed) {
    const phrase = alts.find((a) => out.toLowerCase().includes(a.toLowerCase()));
    if (!phrase) continue;
    const i = out.toLowerCase().indexOf(phrase.toLowerCase());
    out = `${out.slice(0, i)}[ ? ]${out.slice(i + phrase.length)}`;
  }
  return out;
}

/** The template cut into parts, with the fixed phrases marked (to show them in bold). */
export function templateParts(slot: FrameSlot): { text: string; fixed: boolean }[] {
  const marks: [number, number][] = [];
  const lower = slot.t.toLowerCase();
  for (const alts of slot.fixed) {
    const phrase = alts.find((a) => lower.includes(a.toLowerCase()));
    if (!phrase) continue;
    const i = lower.indexOf(phrase.toLowerCase());
    marks.push([i, i + phrase.length]);
  }
  marks.sort((a, b) => a[0] - b[0]);
  const out: { text: string; fixed: boolean }[] = [];
  let at = 0;
  for (const [from, to] of marks) {
    if (from < at) continue;
    if (from > at) out.push({ text: slot.t.slice(at, from), fixed: false });
    out.push({ text: slot.t.slice(from, to), fixed: true });
    at = to;
  }
  if (at < slot.t.length) out.push({ text: slot.t.slice(at), fixed: false });
  return out;
}

export const PARAGRAPH_LABEL: Record<number, { en: string; vi: string }> = {
  1: { en: 'Introduction', vi: 'Mở bài' },
  2: { en: 'Body paragraph 1', vi: 'Thân bài 1' },
  3: { en: 'Body paragraph 2', vi: 'Thân bài 2' },
  4: { en: 'Conclusion', vi: 'Kết bài' },
};

/** Name of paragraph p (1-4) for this question type, in Vietnamese. */
export const paragraphLabel = (type: GuidedType | undefined, p: number) => type?.paras?.[p - 1] ?? PARAGRAPH_LABEL[p]?.vi ?? '';

/** The learner's sentences as an essay: one paragraph per frame paragraph, blank line between. */
export function assembleEssay(items: { p: number; text: string }[]): string {
  const paras = new Map<number, string[]>();
  for (const it of items) {
    const t = it.text.trim();
    if (!t) continue;
    paras.set(it.p, [...(paras.get(it.p) ?? []), t]);
  }
  return [...paras.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, s]) => s.join(' '))
    .join('\n\n');
}

export function modelEssay(prompt: GuidedPrompt, band: Band): string {
  const type = guidedType(prompt.type);
  return assembleEssay(prompt.sentences.map((s) => ({ p: (type && slotOf(type, s.slot)?.p) ?? 1, text: s.en[band] })));
}

export const countWords = (text: string) => words(text).length;

/** What is stored in writing_submissions.metrics.guided, so progress can be shown per prompt and level. */
export interface GuidedRecord {
  prompt: string;
  band: Band;
  level: Level;
  /** average accuracy over the sentences, 0-100 */
  accuracy: number;
  /** sentences where the frame was complete */
  frameOk: number;
  sentences: number;
}
