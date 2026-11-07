import { expect, it } from 'vitest';
import type { Family } from '@/lib/wordforms';
import { DAILY_NEW_GOAL, newLimitFor, starterWords } from './goal';

const fam = (id: string, ex?: string): Family => ({
  id,
  note: null,
  traps: [],
  members: [
    { word: id, pos: 'verb', meaning_vi: `nghĩa ${id}` },
    { word: `${id}ion`, pos: 'noun', meaning_vi: null },
  ],
  examples: ex ? [{ id: 1, sentence: ex, answer: ex.match(/\[(.*)\]/)![1]!, answer_pos: 'verb', base_word: id, why: '' }] : [],
});

it('never offers fewer new cards than the daily goal', () => {
  expect(DAILY_NEW_GOAL).toBe(10);
  expect(newLimitFor(5)).toBe(10);
  expect(newLimitFor(25)).toBe(25);
});

it('suggests headwords not in the notebook, with an example sentence', () => {
  const rows = starterWords([fam('decide', 'They [decided] to stay.'), fam('pollute'), fam('educate')], new Set(['pollute']), 2);
  expect(rows.map((r) => r.term)).toEqual(['decide', 'educate']);
  expect(rows[0]).toMatchObject({ meaning_vi: 'nghĩa decide', part_of_speech: 'verb', context_sentence: 'They decided to stay.', topic: 'IELTS' });
  expect(rows[1]!.context_sentence).toBeNull();
});
