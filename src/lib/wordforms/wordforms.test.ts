import { buildIndex, familyFor, gradeForm, lemmas, makeFixItem, makeGrid, shuffle, sortableWords, splitExample, suggestedPos, type Family } from './index';

const decide: Family = {
  id: 'decide',
  note: null,
  traps: [],
  members: [
    { word: 'decide', pos: 'verb', meaning_vi: null },
    { word: 'decision', pos: 'noun', meaning_vi: null },
    { word: 'decisive', pos: 'adj', meaning_vi: null },
    { word: 'decisively', pos: 'adv', meaning_vi: null },
    { word: 'indecisive', pos: 'adj', meaning_vi: null },
  ],
  examples: [{ id: 1, sentence: 'They reached a [decision] at last.', answer: 'decision', answer_pos: 'noun', base_word: 'decide', why: 'sau a → n' }],
};
const increase: Family = {
  id: 'increase',
  note: null,
  traps: ['same-form'],
  members: [
    { word: 'increase', pos: 'noun', meaning_vi: null },
    { word: 'increase', pos: 'verb', meaning_vi: null },
    { word: 'increasingly', pos: 'adv', meaning_vi: null },
  ],
  examples: [],
};
const similar: Family = {
  id: 'similar',
  note: null,
  traps: [],
  members: [
    { word: 'similar', pos: 'adj', meaning_vi: null },
    { word: 'similarity', pos: 'noun', meaning_vi: null },
    { word: 'similarly', pos: 'adv', meaning_vi: null },
  ],
  examples: [],
};
const idx = buildIndex([decide, increase, similar]);

it('finds dictionary forms of inflected words', () => {
  expect(lemmas('similarities')).toContain('similarity');
  expect(lemmas('financed')).toContain('finance');
  expect(lemmas('emphasizes')).toContain('emphasize');
  expect(idx.lookup('Similarities')[0]?.member.word).toBe('similarity');
  expect(idx.lookup('decided')[0]?.member.word).toBe('decide');
  expect(idx.lookup('banana')).toEqual([]);
});

it('detects same-family words', () => {
  expect(idx.sameFamily('decision', 'decisive')).toBe(true);
  expect(idx.sameFamily('decided', 'decision')).toBe(true);
  expect(idx.sameFamily('decision', 'decision')).toBe(false);
  expect(idx.sameFamily('decision', 'similar')).toBe(false);
  expect(familyFor(idx, 'indecisive')?.id).toBe('decide');
});

it('suggests a corrected word type only when unambiguous', () => {
  expect(suggestedPos(idx, 'decision', 'adj')).toBe('noun');
  expect(suggestedPos(idx, 'decision', 'noun')).toBeNull();
  expect(suggestedPos(idx, 'increase', 'noun')).toBeNull(); // noun and verb
  expect(suggestedPos(idx, 'unknown', 'noun')).toBeNull();
  expect(suggestedPos(idx, 'decision', null)).toBeNull();
});

it('grades answers', () => {
  expect(gradeForm(idx, decide, 'decision', ' Decision ')).toEqual({ result: 'correct', typedPos: null });
  expect(gradeForm(idx, decide, 'decision', 'decisive')).toEqual({ result: 'word_form', typedPos: 'adj' });
  expect(gradeForm(idx, decide, 'decision', 'decide')).toEqual({ result: 'word_form', typedPos: 'verb' });
  expect(gradeForm(idx, decide, 'decision', 'desicion')).toEqual({ result: 'spelling', typedPos: null });
  expect(gradeForm(idx, decide, 'decision', 'table')).toEqual({ result: 'other', typedPos: null });
});

it('builds exercises', () => {
  expect(splitExample('They reached a [decision] at last.')).toEqual({ before: 'They reached a ', answer: 'decision', after: ' at last.' });
  const fix = makeFixItem(decide, decide.examples[0]!, 1);
  expect(fix?.sentence).toBe('They reached a decisive at last.');
  const grid = makeGrid(decide);
  expect(grid.given.word).toBe('decide');
  expect(grid.cells.find((c) => c.pos === 'adj')?.accepted).toEqual(['decisive', 'indecisive']);
  expect(grid.cells.map((c) => c.pos)).toEqual(['noun', 'adj', 'adv']);
});

it('only sorts single-type words and shuffles reproducibly', () => {
  const words = sortableWords(idx).map((m) => m.word);
  expect(words).toContain('decision');
  expect(words).not.toContain('increase');
  expect(shuffle([1, 2, 3, 4, 5], 7)).toEqual(shuffle([1, 2, 3, 4, 5], 7));
  expect(shuffle([1, 2, 3, 4, 5], 7).sort()).toEqual([1, 2, 3, 4, 5]);
});
