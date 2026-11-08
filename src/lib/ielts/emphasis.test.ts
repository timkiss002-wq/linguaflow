import { describe, expect, it } from 'vitest';
import { emphasisPhrases, splitEmphasis } from './emphasis';
import { testById } from './tests';

describe('keyword stress', () => {
  const part = testById('listening-1')!.parts[0]!;

  it('stresses the answers that are said in the script, not the distractors', () => {
    const phrases = emphasisPhrases(part).map((p) => p.toLowerCase());
    expect(phrases).toContain('thursday');
    expect(phrases).toContain('fourteenth');
    expect(phrases).not.toContain('tuesday');
  });

  it('splits a line into plain and stressed pieces, including spellings', () => {
    expect(splitEmphasis('But there are a few places left on Thursday.', ['Thursday'])).toEqual([
      { text: 'But there are a few places left on ', em: false },
      { text: 'Thursday', em: true },
      { text: '.', em: false },
    ]);
    const spelt = splitEmphasis("Yes, it's Anna Kowalski. That's K, O, W, A, L, S, K, I.", []);
    expect(spelt.find((s) => s.em)?.text).toBe('K, O, W, A, L, S, K, I');
  });

  it('matches whole words only and leaves lines without keywords alone', () => {
    expect(splitEmphasis('Thursdays are busy', ['Thursday'])).toEqual([{ text: 'Thursdays are busy', em: false }]);
    expect(splitEmphasis('Hello there.', ['Thursday'])).toEqual([{ text: 'Hello there.', em: false }]);
  });
});
