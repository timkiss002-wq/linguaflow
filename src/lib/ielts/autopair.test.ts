import { describe, expect, it } from 'vitest';
import { buildPrompt, parsePairs, type PairRequest } from '../../../supabase/functions/_shared/p3-pairs.ts';
import { applyPairs, guessLine, locate, markLine } from './autopair';
import { grade, parseImport } from './passage3';

const passage = `Most of the first mills powered by the tide belonged to monasteries, which had both the labour
and the capital to build them. In 1450 the abbey at Eling rebuilt its mill.`;
const req: PairRequest = { type: 'tfng', passage, questions: ['Early tidal mills were mainly built by religious communities.', 'The mill at Eling was rebuilt by a king.'] };

describe('AI pairs', () => {
  it('asks for keywords without sending the answers', () => {
    const { user } = buildPrompt(req);
    expect(user).toContain('1. Early tidal mills');
    expect(user.split('QUESTIONS:')[1]).not.toMatch(/\|\||TRUE|FALSE/);
  });

  it('keeps only keywords found in the question and partners found in the passage', () => {
    const raw = JSON.stringify({
      questions: [
        { n: 1, keywords: [{ q: 'religious communities', p: 'monasteries', vi: 'tu viện', obvious: false }, { q: 'mainly', p: 'Most of', vi: 'phần lớn', obvious: false }, { q: 'invented', p: 'x', vi: '', obvious: false }] },
        { n: 2, keywords: [{ q: 'Eling', p: 'Eling', vi: '', obvious: true }, { q: 'a king', p: null, vi: 'không có', obvious: false }, { q: 'rebuilt', p: 'rebuilt the bridge', vi: '', obvious: false }] },
      ],
    });
    const out = parsePairs(raw, req);
    expect(out[0]!.map((k) => k.q)).toEqual(['religious communities', 'mainly']);
    expect(out[1]!.map((k) => [k.q, k.p])).toEqual([
      ['Eling', 'Eling'],
      ['a king', null],
    ]);
    expect(() => parsePairs('not json', req)).toThrow();
  });

  it('turns the pairs into a keyed set that grades each pair', () => {
    const questions = 'Early tidal mills were mainly built by religious communities. || TRUE\nThe mill at Eling was rebuilt by a king. || NOT GIVEN';
    const pairs = parsePairs(
      JSON.stringify({
        questions: [
          { n: 1, keywords: [{ q: 'mainly', p: 'Most of', vi: '', obvious: false }, { q: 'religious communities', p: 'monasteries', vi: 'tu viện', obvious: false }] },
          { n: 2, keywords: [{ q: 'Eling', p: 'Eling', vi: '', obvious: true }, { q: 'a king', p: null, vi: '', obvious: false }] },
        ],
      }),
      req,
    );
    const { text, key } = applyPairs(questions, passage, pairs);
    expect(text.split('\n')[0]).toBe('Early tidal mills were [mainly] built by [religious communities]. || TRUE');
    expect(text.split('\n')[1]).toContain('{Eling}');
    const { set } = parseImport({ title: 'x', type: 'tfng', passage, questions: text, box: '', key });
    expect(set!.keyless).toBe(false);
    expect(set!.items[0]!.pairs.k2).toEqual({ p: 'monasteries', vi: 'tu viện' });
    const res = grade(set!, 1, { sel: {}, none: { k1: true }, ans: 'NG', checked: false });
    expect(res.pairs.find((p) => p.id === 'k1')!.ok).toBe(true);
    expect(res.ansOk).toBe(true);
  });

  it('finds a phrase across line breaks and keeps the passage spelling', () => {
    expect(locate(passage, 'the labour and the capital')).toBe('the labour\nand the capital');
    expect(locate(passage, 'castle')).toBeNull();
  });

  it('does not re-mark a line the learner already marked', () => {
    expect(markLine('The [abbey] rebuilt it. || TRUE', [{ q: 'rebuilt', p: 'rebuilt', vi: '', obvious: true }])).toBe('The [abbey] rebuilt it. || TRUE');
  });
});

describe('guessing without AI', () => {
  it('marks names, numbers and repeated words as obvious and other content words as keywords', () => {
    const line = guessLine('In 1450 the monks at Eling demolished their mill. || FALSE', passage);
    expect(line).toBe('In {1450} the [monks] at {Eling} [demolished] their {mill}. || FALSE');
  });
});
