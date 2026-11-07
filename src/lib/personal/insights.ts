import { pinyin } from 'pinyin-pro';
import { spellingSimilarity } from '@/lib/compare/align';
import { CATEGORIES } from '../../../supabase/functions/_shared/writing-feedback.ts';

/* ───────────── classification of single mistakes ───────────── */

export type ZhPairKind = 'tone' | 'initial' | 'final' | 'same-sound' | 'other';

/** Splits a character's (default) reading: 买 → { initial: 'm', final: 'ai', tone: 3 }. */
export function syllable(ch: string) {
  return {
    initial: pinyin(ch, { pattern: 'initial' }) || '∅',
    final: pinyin(ch, { pattern: 'final', toneType: 'none' }),
    tone: Number(pinyin(ch, { pattern: 'num' })) || 5,
    text: pinyin(ch),
  };
}

/** What kind of mishearing a wrong character is: tone, initial consonant, final, same sound (writing), or other. */
export function classifyZhPair(expected: string, typed: string): { kind: ZhPairKind; detail: string } {
  if ([...expected].length !== 1 || [...typed].length !== 1 || !/\p{Script=Han}/u.test(expected + typed)) return { kind: 'other', detail: '' };
  const a = syllable(expected);
  const b = syllable(typed);
  if (a.initial === b.initial && a.final === b.final)
    return a.tone === b.tone ? { kind: 'same-sound', detail: `${expected}/${typed} (${a.text})` } : { kind: 'tone', detail: `tone ${a.tone} → ${b.tone}` };
  if (a.final === b.final) return { kind: 'initial', detail: `${a.initial} → ${b.initial}` };
  if (a.initial === b.initial) return { kind: 'final', detail: `${a.final} → ${b.final}` };
  return { kind: 'other', detail: `${a.text} → ${b.text}` };
}

export type EnPairKind = 'ending' | 'word-form' | 'spelling' | 'other';

/** English substitution: dropped/added ending (-s/-ed/-ing), other form of the family, spelling slip, or a different word. */
export function classifyEnPair(expected: string, typed: string, sameFamily?: (a: string, b: string) => boolean): { kind: EnPairKind; detail: string } {
  const e = expected.toLowerCase();
  const t = typed.toLowerCase();
  for (const end of ['s', 'es', 'ed', 'd', 'ing']) {
    if (e === t + end) return { kind: 'ending', detail: `-${end} missing` };
    if (t === e + end) return { kind: 'ending', detail: `extra -${end}` };
  }
  if (sameFamily?.(e, t)) return { kind: 'word-form', detail: `${t} → ${e}` };
  if (spellingSimilarity(e, t) >= 0.75) return { kind: 'spelling', detail: `${t} → ${e}` };
  return { kind: 'other', detail: `${t} → ${e}` };
}

export const EN_FUNCTION_WORDS = new Set(
  'a an the to of in on at for from by with about as into than then and or but so if that this these those it its is are was were be been being have has had do does did will would can could should may might must not no i you he she we they me him her us them my your his our their there here some any up out'.split(' '),
);
export const ZH_PARTICLES = new Set(['了', '的', '地', '得', '吧', '呢', '吗', '着', '过', '啊', '嘛']);

/* ───────────── report ───────────── */

export interface InsightData {
  days: number;
  pairs: { language: 'en' | 'zh'; expected: string; typed: string; count: number; sentence: string }[];
  missed: { language: 'en' | 'zh'; word: string; count: number }[];
  sentences: Partial<Record<'en' | 'zh', { n: number; accuracy: number | null; missing: number; misspelled: number; tone: number; wrong_character: number; misheard: number; word_form: number }>>;
  reviews: { language: 'en' | 'zh'; rating: 'again' | 'hard' | 'good' | 'easy'; count: number }[];
  typing: Partial<Record<'en' | 'zh', { n: number; correct: number }>>;
  word_forms: { n: number; correct: number };
  leeches: { id: string; term: string; language: 'en' | 'zh'; lapses: number; meaning_vi: string | null }[];
  habits: {
    slots: Partial<Record<Slot, { minutes: number; sessions: number }>>;
    accuracy_by_slot: Partial<Record<Slot, { accuracy: number; n: number }>>;
    avg_session_minutes: number | null;
    active_days_14: number;
  };
}

export type Slot = 'morning' | 'afternoon' | 'evening' | 'night';
export const SLOT_LABEL: Record<Slot, string> = { morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'late night' };

export interface Insight {
  id: string;
  kind: 'strength' | 'weakness' | 'info';
  area: 'listening' | 'sounds' | 'characters' | 'english' | 'vocabulary' | 'word-forms' | 'writing' | 'ielts' | 'habits';
  language?: 'en' | 'zh';
  title: string;
  detail: string;
  /** What the conclusion is based on, e.g. "7 of 23 wrong characters". */
  evidence: string;
  examples?: string[];
  action?: { label: string; href: string };
}

/** Minimum evidence before saying anything — avoids conclusions from one bad day. */
export const MIN = { sentences: 10, pattern: 3, reviews: 20, typing: 10, wordForms: 10, habitAnswers: 5, ielts: 5 };

const IELTS_TYPE_LABEL: Record<string, string> = {
  tfng: 'True / False / Not Given',
  ynng: 'Yes / No / Not Given',
  mcq: 'multiple choice',
  headings: 'matching headings',
  matching: 'matching',
  gap: 'completion (gap fill)',
};

const pct = (a: number, b: number) => Math.round((a / b) * 100);

function topGroups<T>(items: T[], key: (t: T) => string, weight: (t: T) => number) {
  const m = new Map<string, { n: number; items: T[] }>();
  for (const it of items) {
    const k = key(it);
    const g = m.get(k) ?? { n: 0, items: [] };
    g.n += weight(it);
    g.items.push(it);
    m.set(k, g);
  }
  return [...m.entries()].map(([k, g]) => ({ key: k, ...g })).sort((a, b) => b.n - a.n);
}

export function buildInsights(
  d: InsightData,
  opts: {
    sameFamily?: (a: string, b: string) => boolean;
    habitAnalysis: boolean;
    plannedDays: number;
    /** AI writing feedback (P6): the corrections of each reviewed text. */
    writing?: { language: 'en' | 'zh'; corrections: { category: string; original: string; corrected: string }[] }[];
    /** IELTS practice tests (W2): every marked question, with its skill and question type. */
    ielts?: { skill: 'reading' | 'listening'; type: string; mark: string }[];
  },
): Insight[] {
  const out: Insight[] = [];

  /* Chinese listening */
  const zh = d.sentences.zh;
  const zhPairs = d.pairs.filter((p) => p.language === 'zh').map((p) => ({ ...p, ...classifyZhPair(p.expected, p.typed) }));
  const zhWrong = zhPairs.reduce((n, p) => n + p.count, 0);
  const byKind = (k: ZhPairKind) => zhPairs.filter((p) => p.kind === k);
  const tone = topGroups(byKind('tone'), (p) => p.detail, (p) => p.count);
  const toneTotal = tone.reduce((n, g) => n + g.n, 0);
  if (toneTotal >= MIN.pattern) {
    out.push({
      id: 'zh-tones', kind: 'weakness', area: 'sounds', language: 'zh',
      title: 'Tones',
      detail: `You hear the syllable but pick the wrong tone — most often ${tone[0]!.key}${tone[1] ? ` and ${tone[1].key}` : ''}.`,
      evidence: `${toneTotal} of ${zhWrong} wrong characters`,
      examples: tone.flatMap((g) => g.items).slice(0, 4).map((p) => `${p.expected}→${p.typed}`),
      action: { label: 'Slow replay in dictation', href: '/lessons?lang=zh' },
    });
  }
  for (const [kind, title, label] of [['initial', 'Initial consonants', 'consonants'], ['final', 'Finals (vowel endings)', 'finals']] as const) {
    const groups = topGroups(byKind(kind), (p) => p.detail, (p) => p.count);
    const total = groups.reduce((n, g) => n + g.n, 0);
    if (total >= MIN.pattern) {
      out.push({
        id: `zh-${kind}`, kind: 'weakness', area: 'sounds', language: 'zh', title,
        detail: `You mix up ${label}: ${groups.slice(0, 3).map((g) => g.key).join(', ')}.`,
        evidence: `${total} of ${zhWrong} wrong characters`,
        examples: groups.flatMap((g) => g.items).slice(0, 4).map((p) => `${p.expected}→${p.typed}`),
      });
    }
  }
  const same = byKind('same-sound');
  const sameTotal = same.reduce((n, p) => n + p.count, 0);
  if (sameTotal >= 2) {
    out.push({
      id: 'zh-same-sound', kind: 'weakness', area: 'characters', language: 'zh',
      title: 'Same-sound characters',
      detail: 'You heard correctly but chose the wrong 汉字 for the sound.',
      evidence: `${sameTotal} of ${zhWrong} wrong characters`,
      examples: same.slice(0, 5).map((p) => `${p.expected}/${p.typed}`),
      action: { label: 'Practise these pairs', href: '#drill' },
    });
  }
  const particles = d.missed.filter((m) => m.language === 'zh' && ZH_PARTICLES.has(m.word));
  const particleTotal = particles.reduce((n, m) => n + m.count, 0);
  if (particleTotal >= MIN.pattern) {
    out.push({
      id: 'zh-particles', kind: 'weakness', area: 'listening', language: 'zh', title: 'Small particles',
      detail: 'Short, unstressed particles are easy to miss when listening.',
      evidence: `${particleTotal} particles missed`,
      examples: particles.sort((a, b) => b.count - a.count).slice(0, 5).map((m) => `${m.word} ×${m.count}`),
    });
  }
  if (zh && zh.n >= MIN.sentences && zh.accuracy !== null) {
    if (zh.accuracy >= 90) out.push({ id: 'zh-accuracy', kind: 'strength', area: 'listening', language: 'zh', title: 'Chinese listening', detail: `You get ${zh.accuracy}% of characters right.`, evidence: `${zh.n} sentences checked` });
    else if (zh.accuracy < 70) out.push({ id: 'zh-accuracy', kind: 'weakness', area: 'listening', language: 'zh', title: 'Chinese listening level', detail: `${zh.accuracy}% accuracy — try lessons one level lower, or 0.75× speed.`, evidence: `${zh.n} sentences checked`, action: { label: 'Easier lessons', href: '/lessons?lang=zh' } });
  }

  /* English listening */
  const en = d.sentences.en;
  const enPairs = d.pairs.filter((p) => p.language === 'en').map((p) => ({ ...p, ...classifyEnPair(p.expected, p.typed, opts.sameFamily) }));
  const endings = enPairs.filter((p) => p.kind === 'ending');
  const endingTotal = endings.reduce((n, p) => n + p.count, 0);
  if (endingTotal >= 2) {
    out.push({
      id: 'en-endings', kind: 'weakness', area: 'english', language: 'en', title: 'Word endings',
      detail: 'You drop or add -s / -ed / -ing. Listen for the last sound and check the grammar (plural, past tense).',
      evidence: `${endingTotal} times`,
      examples: endings.slice(0, 4).map((p) => `${p.typed} → ${p.expected}`),
    });
  }
  const fn = d.missed.filter((m) => m.language === 'en' && EN_FUNCTION_WORDS.has(m.word));
  const fnTotal = fn.reduce((n, m) => n + m.count, 0);
  if (fnTotal >= MIN.pattern) {
    out.push({
      id: 'en-function-words', kind: 'weakness', area: 'english', language: 'en', title: 'Small words (a, the, of…)',
      detail: 'Unstressed function words are often missed — they are said quickly and reduced.',
      evidence: `${fnTotal} missed`,
      examples: fn.sort((a, b) => b.count - a.count).slice(0, 6).map((m) => `${m.word} ×${m.count}`),
    });
  }
  const forms = enPairs.filter((p) => p.kind === 'word-form');
  const wf = d.word_forms;
  if (forms.length >= 2 || (wf.n >= MIN.wordForms && pct(wf.correct, wf.n) < 70)) {
    out.push({
      id: 'en-word-forms', kind: 'weakness', area: 'word-forms', language: 'en', title: 'Word forms',
      detail: 'Right word family, wrong form (noun / verb / adjective / adverb).',
      evidence: wf.n ? `${pct(wf.correct, wf.n)}% correct in ${wf.n} word-form answers` : `${forms.length} times in dictation`,
      examples: forms.slice(0, 4).map((p) => `${p.typed} → ${p.expected}`),
      action: { label: 'Word forms practice', href: '/word-forms' },
    });
  } else if (wf.n >= MIN.wordForms && pct(wf.correct, wf.n) >= 85) {
    out.push({ id: 'en-word-forms', kind: 'strength', area: 'word-forms', language: 'en', title: 'Word forms', detail: `${pct(wf.correct, wf.n)}% correct.`, evidence: `${wf.n} answers` });
  }
  const spelling = enPairs.filter((p) => p.kind === 'spelling');
  if (en && en.n >= MIN.sentences && en.misspelled / en.n >= 0.3) {
    out.push({
      id: 'en-spelling', kind: 'weakness', area: 'english', language: 'en', title: 'Spelling',
      detail: 'You hear the word but misspell it — save these words and practise typing them.',
      evidence: `${en.misspelled} spelling slips in ${en.n} sentences`,
      examples: spelling.slice(0, 4).map((p) => p.detail),
      action: { label: 'Typing practice', href: '/vocabulary/practice?lang=en' },
    });
  }
  if (en && en.n >= MIN.sentences && en.accuracy !== null) {
    if (en.accuracy >= 90) out.push({ id: 'en-accuracy', kind: 'strength', area: 'listening', language: 'en', title: 'English listening', detail: `You get ${en.accuracy}% of words right.`, evidence: `${en.n} sentences checked` });
    else if (en.accuracy < 70) out.push({ id: 'en-accuracy', kind: 'weakness', area: 'listening', language: 'en', title: 'English listening level', detail: `${en.accuracy}% accuracy — try easier lessons or the slow replay.`, evidence: `${en.n} sentences checked`, action: { label: 'Easier lessons', href: '/lessons?lang=en' } });
  }

  /* Vocabulary */
  const rev = d.reviews.reduce((acc, r) => ((acc[r.rating] = (acc[r.rating] ?? 0) + r.count), acc), {} as Record<string, number>);
  const revTotal = Object.values(rev).reduce((a, b) => a + b, 0);
  if (revTotal >= MIN.reviews) {
    const recall = pct(revTotal - (rev.again ?? 0), revTotal);
    if (recall >= 85) out.push({ id: 'srs-recall', kind: 'strength', area: 'vocabulary', title: 'Remembering words', detail: `You recall ${recall}% of flashcards.`, evidence: `${revTotal} reviews` });
    else if (recall < 70) out.push({ id: 'srs-recall', kind: 'weakness', area: 'vocabulary', title: 'Remembering words', detail: `You recall ${recall}% of flashcards — fewer new cards a day gives each word more attention.`, evidence: `${revTotal} reviews`, action: { label: 'Lower new cards per day', href: '/settings' } });
  }
  if (d.leeches.length) {
    out.push({
      id: 'leeches', kind: 'weakness', area: 'vocabulary', title: 'Words you keep forgetting',
      detail: 'These cards were forgotten again and again. Retype them and add your own example sentence.',
      evidence: `${d.leeches.length} ${d.leeches.length === 1 ? 'word' : 'words'} forgotten 2+ times`,
      examples: d.leeches.slice(0, 6).map((l) => `${l.term} ×${l.lapses}`),
      action: { label: 'Practise typing them', href: `/vocabulary/practice?ids=${d.leeches.map((l) => l.id).join(',')}` },
    });
  }
  for (const lang of ['en', 'zh'] as const) {
    const t = d.typing[lang];
    if (t && t.n >= MIN.typing) {
      const p = pct(t.correct, t.n);
      if (p >= 85) out.push({ id: `typing-${lang}`, kind: 'strength', area: 'vocabulary', language: lang, title: lang === 'en' ? 'Spelling saved words' : 'Writing saved words (汉字)', detail: `${p}% right on the first try.`, evidence: `${t.n} typing answers` });
      else if (p < 60) out.push({ id: `typing-${lang}`, kind: 'weakness', area: 'vocabulary', language: lang, title: lang === 'en' ? 'Spelling saved words' : 'Writing saved words (汉字)', detail: `${p}% right on the first try.`, evidence: `${t.n} typing answers`, action: { label: 'Typing practice', href: `/vocabulary/practice?lang=${lang}` } });
    }
  }

  /* Writing: error types the AI corrected again and again (P6) */
  for (const lang of ['en', 'zh'] as const) {
    const texts = (opts.writing ?? []).filter((w) => w.language === lang);
    const byCat = new Map<string, { n: number; texts: number; examples: string[] }>();
    for (const t of texts) {
      const seen = new Set<string>();
      for (const c of t.corrections) {
        if (c.category === 'other') continue;
        const g = byCat.get(c.category) ?? { n: 0, texts: 0, examples: [] };
        g.n += 1;
        if (!seen.has(c.category)) g.texts += 1;
        seen.add(c.category);
        const ex = `${c.original.slice(0, 30)} → ${c.corrected.slice(0, 30)}`;
        if (g.examples.length < 3 && !g.examples.includes(ex)) g.examples.push(ex);
        byCat.set(c.category, g);
      }
    }
    for (const [cat, g] of [...byCat.entries()].sort((a, b) => b[1].n - a[1].n)) {
      if (g.n < MIN.pattern || g.texts < 2) continue;
      out.push({
        id: `writing-${lang}-${cat}`, kind: 'weakness', area: 'writing', language: lang,
        title: `Writing: ${CATEGORIES[lang][cat] ?? cat}`,
        detail: 'The AI feedback keeps correcting this in your texts.',
        evidence: `${g.n} corrections in ${g.texts} texts`,
        examples: g.examples,
        action: { label: 'Write another text', href: `/writing?lang=${lang}` },
      });
    }
  }

  /* IELTS practice tests: question types (W2) */
  for (const skill of ['reading', 'listening'] as const) {
    const rs = (opts.ielts ?? []).filter((r) => r.skill === skill);
    const name = skill === 'reading' ? 'Reading' : 'Listening';
    const types = topGroups(rs, (r) => r.type, () => 1);
    for (const g of types) {
      const right = g.items.filter((r) => r.mark === 'correct').length;
      const p = pct(right, g.n);
      const label = IELTS_TYPE_LABEL[g.key] ?? g.key;
      const base = { id: `ielts-${skill}-${g.key}`, area: 'ielts' as const, language: 'en' as const, title: `IELTS ${name}: ${label}`, evidence: `${right} of ${g.n} questions right` };
      if (g.n >= MIN.ielts && p < 60)
        out.push({ ...base, kind: 'weakness', detail: `${p}% right — below the level needed for band 6.5. Read the explanation of every wrong answer and find the evidence in the text.`, action: { label: 'Practise', href: '/ielts' } });
      else if (g.n >= MIN.ielts + 3 && p >= 85) out.push({ ...base, kind: 'strength', detail: `${p}% right.` });
    }
    const form = rs.filter((r) => r.type === 'gap' && (r.mark === 'spelling' || r.mark === 'too_long')).length;
    if (form >= MIN.pattern)
      out.push({
        id: `ielts-${skill}-form`, kind: 'weakness', area: 'ielts', language: 'en', title: `IELTS ${name}: spelling and word limits`,
        detail: 'Answers lost to spelling or to writing more words than allowed — in the exam these are simply wrong.',
        evidence: `${form} completion answers`, action: { label: 'Practise', href: '/ielts' },
      });
  }

  /* Habits (only with consent) */
  if (opts.habitAnalysis) {
    const acc = Object.entries(d.habits.accuracy_by_slot).filter(([, v]) => v && v.n >= MIN.habitAnswers) as [Slot, { accuracy: number; n: number }][];
    if (acc.length >= 2) {
      const sorted = [...acc].sort((a, b) => b[1].accuracy - a[1].accuracy);
      const [best, worst] = [sorted[0]!, sorted[sorted.length - 1]!];
      if (best[1].accuracy - worst[1].accuracy >= 5) {
        out.push({ id: 'habit-best-time', kind: 'info', area: 'habits', title: 'Your best time', detail: `You're most accurate in the ${SLOT_LABEL[best[0]]} (${best[1].accuracy}% vs ${worst[1].accuracy}% in the ${SLOT_LABEL[worst[0]]}). Put new lessons there; use other times for review.`, evidence: `${best[1].n + worst[1].n} sentences` });
      }
    }
    const planned14 = opts.plannedDays * 2;
    if (planned14 > 0) {
      const ratio = d.habits.active_days_14 / planned14;
      if (ratio >= 0.85) out.push({ id: 'habit-consistency', kind: 'strength', area: 'habits', title: 'Consistency', detail: `You studied on ${d.habits.active_days_14} of ${planned14} planned days in the last two weeks.`, evidence: 'last 14 days' });
      else if (ratio < 0.5 && d.habits.active_days_14 > 0) out.push({ id: 'habit-consistency', kind: 'weakness', area: 'habits', title: 'Consistency', detail: `You studied on ${d.habits.active_days_14} of ${planned14} planned days. Shorter daily sessions are easier to keep than long, rare ones.`, evidence: 'last 14 days', action: { label: 'Adjust your plan', href: '/onboarding' } });
    }
  }

  return out;
}
