import { describe, expect, it } from 'vitest';
import type { VocabWord } from '@/features/vocabulary/api';
import { buildIndex, type Family } from '@/lib/wordforms';
import { buildCards, makeGap, makeMcq, markGap, markWord, ratingFor } from './practice';

const w = (term: string, extra: Partial<VocabWord> = {}) =>
  ({ id: term, term, language: 'en', meaning_vi: null, part_of_speech: null, context_sentence: null, examples: [], repetitions: 0, ...extra }) as VocabWord;

const decide: Family = {
  id: 'decide',
  note: null,
  traps: [],
  members: [
    { word: 'decide', pos: 'verb', meaning_vi: 'quyết định' },
    { word: 'decision', pos: 'noun', meaning_vi: 'sự quyết định' },
    { word: 'decisive', pos: 'adj', meaning_vi: 'quyết đoán' },
    { word: 'decisively', pos: 'adv', meaning_vi: 'một cách dứt khoát' },
  ],
  examples: [
    { id: 1, sentence: 'They finally [decided] to move.', answer: 'decided', answer_pos: 'verb', base_word: 'decide', why: 'sau chủ ngữ → động từ' },
    { id: 2, sentence: 'The committee reached a [decision] today.', answer: 'decision', answer_pos: 'noun', base_word: 'decide', why: 'sau mạo từ a → danh từ' },
  ],
};
const index = buildIndex([decide]);

describe('MCQ', () => {
  it('has the right meaning once, among distinct options', () => {
    const q = makeMcq(w('decide', { meaning_vi: 'quyết định', part_of_speech: 'verb' }), [
      { meaning: 'quyết định', pos: 'verb' },
      { meaning: 'chạy', pos: 'verb' },
      { meaning: 'ăn', pos: 'verb' },
      { meaning: 'đẹp', pos: 'adj' },
      { meaning: 'chạy', pos: 'verb' },
    ], 3)!;
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answer]).toBe('quyết định');
  });
  it('is skipped without a meaning or enough other meanings', () => {
    expect(makeMcq(w('x'), [{ meaning: 'a', pos: null }, { meaning: 'b', pos: null }], 1)).toBeNull();
    expect(makeMcq(w('x', { meaning_vi: 'x' }), [{ meaning: 'a', pos: null }], 1)).toBeNull();
  });
});

describe('gap', () => {
  it('prefers a family example that needs another form of the word', () => {
    for (let s = 0; s < 4; s++) {
      const g = makeGap(w('decide'), index, s)!;
      expect(g.answer).toBe('decision');
      expect(g.base).toBe('decide');
      expect(g.before).toBe('The committee reached a ');
    }
  });
  it('falls back to the word in its own sentence', () => {
    const g = makeGap(w('harbour', { context_sentence: 'The ship left the harbour at dawn.' }), index, 0)!;
    expect(g).toMatchObject({ before: 'The ship left the ', answer: 'harbour', after: ' at dawn.', base: 'h…', family: null });
    expect(makeGap(w('nothing'), index, 0)).toBeNull();
  });
  it('marks wrong forms of the family as wrong, with a note', () => {
    const g = makeGap(w('decide'), index, 0)!;
    expect(markGap(g, 'Decision', index, 'en').mark).toBe('right');
    expect(markGap(g, 'decison', index, 'en').mark).toBe('close');
    expect(markGap(g, 'decisive', index, 'en')).toEqual({ mark: 'wrong', note: 'Đúng họ từ nhưng sai dạng (bạn dùng tính từ)' });
  });
});

it('marks typed words', () => {
  expect(markWord('environment', ' Environment ', 'en').mark).toBe('right');
  expect(markWord('environment', 'enviroment', 'en').mark).toBe('close');
  expect(markWord('environment', 'pollution', 'en').mark).toBe('wrong');
  expect(markWord('environment', '', 'en').mark).toBe('wrong');
});

it('turns mistakes into a rating', () => {
  expect(ratingFor(['right', 'right', 'right'], { repetitions: 0 })).toBe('good');
  expect(ratingFor(['right', 'right', 'right'], { repetitions: 4 })).toBe('easy');
  expect(ratingFor(['right', 'close', 'right'], { repetitions: 0 })).toBe('hard');
  expect(ratingFor(['wrong', 'right', 'right'], { repetitions: 0 })).toBe('hard');
  expect(ratingFor(['wrong', 'wrong', 'right'], { repetitions: 0 })).toBe('again');
  expect(ratingFor(['wrong'], { repetitions: 0 })).toBe('again');
});

it('builds a card for every word', () => {
  const words = [w('decide', { meaning_vi: 'quyết định' }), w('run', { meaning_vi: 'chạy' }), w('eat', { meaning_vi: 'ăn' })];
  const cards = buildCards(words, words, index, 5);
  expect(cards).toHaveLength(3);
  expect(cards[0]!.gap?.answer).toBe('decision');
  expect(cards[0]!.mcq?.options).toContain('quyết định');
});
