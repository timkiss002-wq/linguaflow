import fixJson from '../../../content/grammar-fix.json';
import phraseJson from '../../../content/roadmap/active-sentences.json';
import svoJson from '../../../content/svo.json';
import { compareEnglish } from '@/lib/compare/english';
import { checkTranslation, expandContractions, topicById, type Checked, type DrillItem } from '@/lib/grammar/drills';
import { ACTIVE_TOPICS, NEW_WORDS, activeExampleVi, passiveExampleVi, type ActiveWord, type Day } from '@/lib/roadmap/plan';
import { usesPhrase } from '@/lib/roadmap/sentences';

/** One sentence to write in English: the prompt (Vietnamese, or a wrong sentence), the accepted answers, help. */
export interface WriteItem {
  key: string;
  /** what is shown: a Vietnamese sentence, or an English sentence with one mistake */
  prompt: string;
  en: string[];
  /** shown on request */
  hint?: string;
  /** shown after checking */
  why?: string;
  /** a word / collocation the answer must contain (in any form) */
  mustUse?: string;
  /** small label above the prompt (topic, word…) */
  label?: string;
  /** a few emoji drawn as a little picture of the sentence */
  scene?: string;
  /** false: passive vocabulary — only has to be right in the end, not on the first try (default true) */
  graded?: boolean;
  /** grammar practice: a "spelling" slip that is really a grammar ending (work/works, bedroom/bedrooms, a/an) is wrong */
  inflection?: boolean;
  /** commas, full stops and semicolons count (linking words: "However, …" / "; therefore, …") */
  punctuation?: boolean;
  /** instruction shown above the prompt instead of the mode's default one */
  task?: string;
  /** explain what is wrong word by word (lib/diagnose); the grammar points the sentence trains */
  diagnose?: string[];
}

/* ---------- Dịch ví dụ ---------- */

/** The example sentences of a day's words in Vietnamese, to translate back into English with the word. */
export function exampleItems(day: Day): WriteItem[] {
  const out: WriteItem[] = [];
  const passive = day.tasks.find((t) => t.kind === 'vocab-new');
  if (passive?.words) {
    for (const w of NEW_WORDS.slice(passive.words[0], passive.words[1])) {
      const vi = passiveExampleVi(w);
      if (vi && w.ex) out.push({ key: `p:${w.t}`, prompt: vi, en: [w.ex], hint: `${w.t} = ${w.m}`, mustUse: w.t, label: 'Từ thụ động', graded: false });
    }
  }
  const active = day.tasks.find((t) => t.kind === 'vocab-active');
  const topic = active?.active ? ACTIVE_TOPICS.find((x) => x.id === active.active!.topic) : undefined;
  if (topic && active?.active) {
    for (const w of topic.words.slice(active.active.from, active.active.to)) {
      const vi = activeExampleVi(topic.id, w);
      if (vi) out.push({ key: `a:${w.t}`, prompt: vi, en: [w.ex], hint: `${w.t} = ${w.m}`, mustUse: w.t, label: `Cụm chủ động · ${topic.vi}` });
    }
  }
  return out;
}

/* ---------- Dịch câu với cụm từ (bài cụm chủ động mỗi ngày) ---------- */

interface PhraseSentence {
  vi: string;
  en: string[];
  hint?: string;
}
const PHRASE_SENTENCES = (phraseJson as { items: Record<string, PhraseSentence[]> }).items;

/**
 * The day's active collocations, 3 simple Vietnamese sentences each, to translate into English with the collocation.
 * A collocation without its 3 sentences falls back to the Vietnamese version of its example, when there is one.
 */
export function phraseItems(topicId: string, words: ActiveWord[]): WriteItem[] {
  return words.flatMap((w) => {
    const list = PHRASE_SENTENCES[`${topicId}:${w.t}`];
    if (list?.length)
      return list.map((s, i) => ({
        key: `${w.t}:${i}`,
        prompt: s.vi,
        en: s.en,
        hint: s.hint ? `${w.t} = ${w.m} · ${s.hint}` : `${w.t} = ${w.m}`,
        mustUse: w.t,
        label: w.t,
      }));
    const vi = activeExampleVi(topicId, w);
    return vi ? [{ key: `${w.t}:ex`, prompt: vi, en: [w.ex], hint: `${w.t} = ${w.m}`, mustUse: w.t, label: w.t }] : [];
  });
}

/**
 * Is the word used? Collocations are written with placeholders ("equip students with", "broaden one's horizons"),
 * so the content words are matched in any form, like in "Viết 3–5 câu".
 */
export const usesWord = (text: string, word: string) => usesPhrase(text, word.replace(/\b(one's|its|their|his|her|sb|sth)\b/g, ' '));

/**
 * Check a written sentence. In "fix" mode a near miss is still a mistake: "student" for "students" is exactly the
 * error being trained, so only an exact match (contractions, capitals and punctuation aside) counts.
 */
export function checkWrite(item: WriteItem, typed: string, strict: boolean): Checked {
  const r0 = checkTranslation({ en: item.en } as DrillItem, typed);
  const r = item.punctuation && r0.verdict !== 'wrong' ? withPunctuation(item, typed, r0) : r0;
  if (r.verdict !== 'spelling') return r;
  if (strict || (item.inflection && r.diff.tokens.some((t) => t.kind === 'misspelled' && t.expected && t.actual && grammarSlip(t.expected, t.actual)))) return { ...r, verdict: 'wrong' };
  return r;
}

/** Same words as an answer: now the punctuation inside the sentence must match one of the answers too. */
function withPunctuation(item: WriteItem, typed: string, r: Checked): Checked {
  const trim = (x: string) => expandContractions(x).trim().replace(/[.!?]+$/, '');
  const mine = trim(typed);
  for (const a of item.en) if (compareEnglish(trim(a), mine, { ignorePunctuation: false }).isCorrect) return { ...r, verdict: 'correct', closest: a };
  const closest = r.closest;
  return { verdict: 'wrong', closest, diff: compareEnglish(trim(closest), mine, { ignorePunctuation: false }) };
}

const ENDINGS = ['s', 'es', 'd', 'ed', 'ing', 'er', 'est', 'n'];
/** Two words that differ only by a grammar ending: work / works, watch / watched, bedroom / bedrooms, a / an, study / studies. */
export function grammarSlip(a: string, b: string) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return false;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  if (l.startsWith(s) && ENDINGS.includes(l.slice(s.length))) return true;
  if (s.endsWith('y') && (l === `${s.slice(0, -1)}ies` || l === `${s.slice(0, -1)}ied`)) return true;
  if (s.endsWith('e') && (l === `${s.slice(0, -1)}ing` || l === `${s}d`)) return true;
  // doubled consonant: stop / stopped, run / running
  return l.length === s.length + 3 && l.startsWith(s) && l[s.length] === s.at(-1) && ['ed', 'ing'].some((e) => l.endsWith(e));
}

/* ---------- Sửa lỗi sai ---------- */

interface FixRaw {
  wrong: string;
  en: string[];
  why_vi: string;
}
const FIX = (fixJson as { topics: Record<string, FixRaw[]> }).topics;
export const fixTopics = () => Object.keys(FIX);

export function fixItems(list: { topic: string; idx: number }[]): WriteItem[] {
  return list.flatMap(({ topic, idx }) => {
    const f = FIX[topic]?.[idx];
    if (!f) return [];
    return [{ key: `${topic}:${idx}`, prompt: f.wrong, en: f.en, why: f.why_vi, label: topicById(topic)?.title_vi ?? topic, hint: hintFor(f) }];
  });
}
/** All items of one topic, for practice outside the path. */
export const fixItemsOfTopic = (topic: string) => fixItems((FIX[topic] ?? []).map((_, idx) => ({ topic, idx })));

/** Points at the words that change, without giving the answer away. */
function hintFor(f: FixRaw) {
  const a = f.wrong.toLowerCase().match(/[a-z']+/g) ?? [];
  const b = new Set(f.en[0]!.toLowerCase().match(/[a-z']+/g) ?? []);
  const odd = a.filter((w) => !b.has(w));
  return odd.length ? `Xem lại: “${odd.slice(0, 2).join(' … ')}”` : 'Lỗi nằm ở chỗ thiếu một từ.';
}

/* ---------- Câu chuẩn S-V-O ---------- */

export type Role = 'S' | 'V' | 'O' | 'C' | 'A';
export const ROLES: Role[] = ['S', 'V', 'O', 'C', 'A'];

export interface Chunk {
  role: Role;
  text: string;
  /** punctuation written right after the chunk ("," or ".") */
  after: string;
}
export interface SvoSentence {
  key: string;
  chunks: Chunk[];
  /** the sentence as written */
  text: string;
  vi: string;
}
interface SvoRaw {
  roles: Record<Role, { name: string; en: string; q: string }>;
  patterns: { id: string; formula: string; en: string; vi: string }[];
  rules_vi: string[];
  sets: { level: number; items: { s: string; vi: string }[] }[];
}
export const SVO = svoJson as SvoRaw;
export const ROLE_INFO = SVO.roles;

/** "[S My mother] [V cooks] [O dinner]." → chunks. */
export function parseChunks(s: string): Chunk[] {
  const out: Chunk[] = [];
  const re = /\[([SVOCA]) ([^\]]+)\]([^[]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push({ role: m[1] as Role, text: m[2]!, after: m[3]!.trim() });
  return out;
}
export const joinChunks = (chunks: Chunk[]) =>
  chunks
    .map((c, i) => {
      const t = i === 0 ? c.text[0]!.toUpperCase() + c.text.slice(1) : c.text;
      return t + c.after;
    })
    .join(' ');

export function svoSet(n: number): SvoSentence[] {
  const set = SVO.sets[n] ?? SVO.sets[0]!;
  return set.items.map((it, i) => {
    const chunks = parseChunks(it.s);
    return { key: `${n}:${i}`, chunks, text: joinChunks(chunks), vi: it.vi };
  });
}
export const svoLevel = (n: number) => SVO.sets[n]?.level ?? 1;

/** The order is right when S, V, O, C keep their order and each A is where it was, at the start or at the end. */
export function orderOk(original: Chunk[], answer: Chunk[]) {
  if (answer.length !== original.length) return false;
  const core = (xs: Chunk[]) => xs.filter((c) => c.role !== 'A').map((c) => c.text);
  if (core(original).join('|') !== core(answer).join('|')) return false;
  if (answer.every((c, i) => c === original[i])) return true;
  const firstCore = answer.findIndex((c) => c.role !== 'A');
  const lastCore = answer.length - 1 - [...answer].reverse().findIndex((c) => c.role !== 'A');
  return answer.every((c, i) => c.role !== 'A' || i < firstCore || i > lastCore);
}

/** A deterministic shuffle (the same sentence is always shuffled the same way), never the original order. */
export function shuffled<T>(xs: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const a = xs.map((x, i) => ({ x, i, r: 0 }));
  for (const e of a) {
    h = Math.imul(h ^ (e.i + 1), 16777619);
    e.r = (h >>> 0) / 2 ** 32;
  }
  const out = [...a].sort((p, q) => p.r - q.r);
  if (xs.length > 1 && out.every((e, i) => e.i === i)) out.push(out.shift()!);
  return out.map((e) => e.x);
}

/** Writing step of S-V-O: the sentence itself is the answer; Vietnamese is the prompt. */
export const svoWriteItem = (s: SvoSentence): WriteItem => ({
  key: `w:${s.key}`,
  prompt: s.vi,
  en: [s.text],
  hint: s.chunks.map((c) => `${c.role}`).join(' + '),
  why: s.chunks.map((c) => `[${c.role}] ${c.text}`).join('  '),
});
