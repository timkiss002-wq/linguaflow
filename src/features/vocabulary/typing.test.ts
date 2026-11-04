import type { VocabWord } from './api';
import { buildQueue, checkTyping, exerciseFor, firstLetterHint } from './typing';

const w = (term: string, extra: Partial<VocabWord> = {}) =>
  ({ id: term, term, language: 'en', typing_level: 0, typing_streak: 0, last_typed_at: null, created_at: '2026-11-01T00:00:00Z', meaning_vi: 'nghĩa', context_sentence: null, examples: [], reading: null, ...extra }) as VocabWord;

describe('buildQueue', () => {
  const words = [
    w('old-new', { created_at: '2026-10-01T00:00:00Z' }),
    w('fresh', { created_at: '2026-11-04T00:00:00Z' }),
    w('wrong', { last_typed_at: '2026-11-03T00:00:00Z', typing_streak: 0, typing_level: 1 }),
    w('ok-later', { last_typed_at: '2026-11-04T00:00:00Z', typing_streak: 2, typing_level: 2 }),
    w('ok-earlier', { last_typed_at: '2026-11-02T00:00:00Z', typing_streak: 1, typing_level: 2 }),
    w('done', { typing_level: 4 }),
    w('超市', { language: 'zh' }),
  ];
  it('orders wrong → never practised (newest first) → least recent, and skips mastered', () => {
    expect(buildQueue(words, { lang: 'en' }).map((x) => x.term)).toEqual(['wrong', 'fresh', 'old-new', 'ok-earlier', 'ok-later']);
  });
  it('respects explicit ids and limits', () => {
    expect(buildQueue(words, { ids: ['done', 'missing', 'fresh'] }).map((x) => x.term)).toEqual(['done', 'fresh']);
    expect(buildQueue(words, { limit: 2 })).toHaveLength(2);
  });
});

describe('exerciseFor', () => {
  it('gets harder with level', () => {
    expect(exerciseFor(w('a', { typing_level: 0 })).mode).toBe('copy');
    expect(exerciseFor(w('a', { typing_level: 1 })).mode).toBe('listen');
    expect(exerciseFor(w('a', { typing_level: 2 })).mode).toBe('meaning');
    expect(exerciseFor(w('demolish', { typing_level: 3, examples: ['They demolish old homes.'] }))).toMatchObject({ mode: 'cloze', cloze: { answer: 'demolish' } });
  });
  it('falls back when data is missing', () => {
    expect(exerciseFor(w('a', { typing_level: 3 })).mode).toBe('meaning');
    expect(exerciseFor(w('a', { typing_level: 3, meaning_vi: null })).mode).toBe('listen');
  });
});

it('checks with the dictation engine', () => {
  expect(checkTyping(w('commence'), 'Commence').isCorrect).toBe(true);
  expect(checkTyping(w('commence'), 'comence').counts.misspelled).toBe(1);
  expect(checkTyping(w('超市', { language: 'zh' }), '超事').isCorrect).toBe(false);
});

it('builds first-letter hints', () => {
  expect(firstLetterHint(w('make way for'))).toBe('m___ w__ f__');
  expect(firstLetterHint(w('超市', { language: 'zh', reading: 'chāo shì' }))).toBe('chāo shì');
});
