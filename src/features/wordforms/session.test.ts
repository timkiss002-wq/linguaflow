import type { Family } from '@/lib/wordforms';
import { buildItems, selectFamilies } from './session';

const fam = (id: string, traps: string[] = []): Family => ({
  id,
  note: null,
  traps,
  members: [
    { word: id, pos: 'verb', meaning_vi: null },
    { word: `${id}ion`, pos: 'noun', meaning_vi: null },
    { word: `${id}ive`, pos: 'adj', meaning_vi: null },
  ],
  examples: [
    { id: 1, sentence: `A [${id}ion] was made.`, answer: `${id}ion`, answer_pos: 'noun', base_word: id, why: 'n' },
    { id: 2, sentence: `They [${id}] it.`, answer: id, answer_pos: 'verb', base_word: `${id}ion`, why: 'v' },
  ],
});
const ALL = [fam('decid'), fam('creat', ['confusable']), fam('protect')];

it('selects notebook families (with inflections) and trap types', () => {
  expect(selectFamilies(ALL, { notebookTerms: ['creations', 'unknown'] }).map((f) => f.id)).toEqual(['creat']);
  expect(selectFamilies(ALL, { trap: 'confusable' }).map((f) => f.id)).toEqual(['creat']);
  expect(selectFamilies(ALL, {})).toHaveLength(3);
});

it('builds each exercise type', () => {
  expect(buildItems('gap', ALL, 3)).toHaveLength(6);
  const fix = buildItems('fix', ALL, 3);
  expect(fix.length).toBe(6);
  for (const f of fix) if (f.kind === 'fix') expect(f.wrong.toLowerCase()).not.toBe(f.example.answer.toLowerCase());
  expect(buildItems('grid', ALL, 3)).toHaveLength(3);
  const sort = buildItems('sort', ALL, 3);
  expect(sort).toHaveLength(9);
  expect(sort.every((s) => s.kind === 'sort' && s.family.members.includes(s.member))).toBe(true);
});
