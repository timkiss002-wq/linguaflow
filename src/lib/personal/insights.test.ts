import { buildInsights, classifyEnPair, classifyZhPair, type InsightData } from './insights';

describe('classifyZhPair', () => {
  it.each([
    ['买', '卖', 'tone', 'tone 3 → 4'],
    ['是', '四', 'initial', 'sh → s'],
    ['安', '肮', 'final', 'an → ang'],
    ['气', '汽', 'same-sound', '气/汽 (qì)'],
    ['我', '他', 'other', 'wǒ → tā'],
  ])('%s→%s is %s', (a, b, kind, detail) => {
    expect(classifyZhPair(a, b)).toEqual({ kind, detail });
  });
  it('ignores multi-character or non-Han pairs', () => {
    expect(classifyZhPair('天气', '天汽').kind).toBe('other');
  });
});

describe('classifyEnPair', () => {
  const fam = (a: string, b: string) => new Set(['decision', 'decisive']).has(a) && new Set(['decision', 'decisive']).has(b) && a !== b;
  it.each([
    ['years', 'year', 'ending', '-s missing'],
    ['worked', 'work', 'ending', '-ed missing'],
    ['work', 'working', 'ending', 'extra -ing'],
    ['decision', 'decisive', 'word-form', 'decisive → decision'],
    ['receive', 'recieve', 'spelling', 'recieve → receive'],
    ['walking', 'working', 'other', 'working → walking'],
  ])('%s vs %s → %s', (e, t, kind, detail) => {
    expect(classifyEnPair(e, t, fam)).toEqual({ kind, detail });
  });
});

const empty: InsightData = {
  days: 60, pairs: [], missed: [], sentences: {}, reviews: [], typing: {}, word_forms: { n: 0, correct: 0 }, leeches: [],
  habits: { slots: {}, accuracy_by_slot: {}, avg_session_minutes: null, active_days_14: 0 },
};
const opts = { habitAnalysis: true, plannedDays: 6 };

describe('buildInsights', () => {
  it('says nothing without enough evidence', () => {
    expect(buildInsights(empty, opts)).toEqual([]);
    expect(buildInsights({ ...empty, sentences: { zh: { n: 3, accuracy: 40, missing: 0, misspelled: 0, tone: 0, wrong_character: 0, misheard: 0, word_form: 0 } } }, opts)).toEqual([]);
  });

  it('finds tone and same-sound patterns in Chinese', () => {
    const d: InsightData = {
      ...empty,
      pairs: [
        { language: 'zh', expected: '买', typed: '卖', count: 2, sentence: '' },
        { language: 'zh', expected: '是', typed: '事', count: 1, sentence: '' }, // shì vs shì → same sound
        { language: 'zh', expected: '好', typed: '号', count: 1, sentence: '' }, // hǎo vs hào → tone
        { language: 'zh', expected: '气', typed: '汽', count: 2, sentence: '' },
      ],
    };
    const ins = buildInsights(d, opts);
    const tones = ins.find((i) => i.id === 'zh-tones')!;
    expect(tones.kind).toBe('weakness');
    expect(tones.evidence).toBe('3 of 6 wrong characters');
    expect(tones.detail).toContain('tone 3 → 4');
    expect(ins.find((i) => i.id === 'zh-same-sound')?.examples).toEqual(['是/事', '气/汽']);
  });

  it('spots English endings and skipped function words', () => {
    const d: InsightData = {
      ...empty,
      pairs: [
        { language: 'en', expected: 'years', typed: 'year', count: 1, sentence: '' },
        { language: 'en', expected: 'arrived', typed: 'arrive', count: 1, sentence: '' },
      ],
      missed: [
        { language: 'en', word: 'the', count: 2 },
        { language: 'en', word: 'of', count: 1 },
        { language: 'en', word: 'bridge', count: 5 },
      ],
    };
    const ins = buildInsights(d, opts);
    expect(ins.find((i) => i.id === 'en-endings')?.examples).toEqual(['year → years', 'arrive → arrived']);
    const fw = ins.find((i) => i.id === 'en-function-words')!;
    expect(fw.evidence).toBe('3 missed');
    expect(fw.examples).toEqual(['the ×2', 'of ×1']);
  });

  it('reports vocabulary strengths and leeches with a practice link', () => {
    const d: InsightData = {
      ...empty,
      reviews: [{ language: 'en', rating: 'good', count: 18 }, { language: 'en', rating: 'again', count: 2 }],
      leeches: [{ id: 'w1', term: 'commensurate', language: 'en', lapses: 3, meaning_vi: null }],
    };
    const ins = buildInsights(d, opts);
    expect(ins.find((i) => i.id === 'srs-recall')).toMatchObject({ kind: 'strength', detail: 'You recall 90% of flashcards.' });
    expect(ins.find((i) => i.id === 'leeches')?.action?.href).toBe('/vocabulary/practice?ids=w1');
  });

  it('uses habits only with consent', () => {
    const d: InsightData = {
      ...empty,
      habits: { slots: {}, accuracy_by_slot: { morning: { accuracy: 94, n: 8 }, evening: { accuracy: 81, n: 12 } }, avg_session_minutes: 12, active_days_14: 11 },
    };
    const on = buildInsights(d, opts);
    expect(on.find((i) => i.id === 'habit-best-time')?.detail).toContain('most accurate in the morning (94% vs 81% in the evening)');
    expect(on.find((i) => i.id === 'habit-consistency')?.kind).toBe('strength');
    expect(buildInsights(d, { ...opts, habitAnalysis: false }).filter((i) => i.area === 'habits')).toEqual([]);
  });
});

describe('buildInsights — AI writing feedback', () => {
  const empty: InsightData = { days: 60, pairs: [], missed: [], sentences: {}, reviews: [], typing: {}, word_forms: { n: 0, correct: 0 }, leeches: [], habits: { slots: {}, accuracy_by_slot: {}, avg_session_minutes: null, active_days_14: 0 } };
  const c = (category: string) => ({ category, original: 'he go', corrected: 'he goes' });
  it('reports an error type corrected 3+ times across 2+ texts', () => {
    const ins = buildInsights(empty, { habitAnalysis: false, plannedDays: 0, writing: [
      { language: 'en', corrections: [c('agreement'), c('agreement'), c('article')] },
      { language: 'en', corrections: [c('agreement'), c('other'), c('other'), c('other')] },
    ] });
    expect(ins.map((i) => i.id)).toEqual(['writing-en-agreement']);
    expect(ins[0]).toMatchObject({ title: 'Writing: Subject–verb agreement', evidence: '3 corrections in 2 texts', action: { href: '/writing?lang=en' } });
  });
  it('needs more than one text', () => {
    const ins = buildInsights(empty, { habitAnalysis: false, plannedDays: 0, writing: [{ language: 'zh', corrections: [c('le'), c('le'), c('le')] }] });
    expect(ins).toEqual([]);
  });
});

describe('buildInsights — IELTS practice tests', () => {
  const r = (skill: 'reading' | 'listening', type: string, mark: string) => ({ skill, type, mark });
  it('flags a weak question type only with enough answers', () => {
    const few = buildInsights(empty, { habitAnalysis: false, plannedDays: 0, ielts: [r('reading', 'tfng', 'wrong'), r('reading', 'tfng', 'wrong')] });
    expect(few.filter((i) => i.area === 'ielts')).toEqual([]);
    const ins = buildInsights(empty, { habitAnalysis: false, plannedDays: 0, ielts: [...Array(4).fill(r('reading', 'tfng', 'wrong')), r('reading', 'tfng', 'correct')] });
    expect(ins.find((i) => i.id === 'ielts-reading-tfng')).toMatchObject({ kind: 'weakness', evidence: '1 of 5 questions right', action: { href: '/ielts/reading?type=tfng' } });
  });
  it('names a strong type and spelling / word-limit losses', () => {
    const ins = buildInsights(empty, { habitAnalysis: false, plannedDays: 0, ielts: [...Array(8).fill(r('listening', 'mcq', 'correct')), ...Array(3).fill(r('listening', 'gap', 'spelling'))] });
    expect(ins.find((i) => i.id === 'ielts-listening-mcq')?.kind).toBe('strength');
    expect(ins.find((i) => i.id === 'ielts-listening-form')).toMatchObject({ kind: 'weakness', evidence: '3 completion answers' });
  });
});
