import { describe, expect, it } from 'vitest';
import { addHighlight, evidenceRanges, removeHighlight, segment } from './highlights';

describe('highlights', () => {
  it('merges overlapping and touching ranges in the same paragraph only', () => {
    let l = addHighlight([], { p: 0, start: 5, end: 10 });
    l = addHighlight(l, { p: 0, start: 8, end: 15 });
    l = addHighlight(l, { p: 0, start: 15, end: 20 });
    l = addHighlight(l, { p: 1, start: 6, end: 9 });
    expect(l).toEqual([
      { p: 0, start: 5, end: 20 },
      { p: 1, start: 6, end: 9 },
    ]);
  });

  it('ignores empty ranges', () => {
    expect(addHighlight([], { p: 0, start: 4, end: 4 })).toEqual([]);
  });

  it('removing trims or splits highlights', () => {
    const l = [{ p: 0, start: 0, end: 20 }];
    expect(removeHighlight(l, { p: 0, start: 5, end: 10 })).toEqual([
      { p: 0, start: 0, end: 5 },
      { p: 0, start: 10, end: 20 },
    ]);
    expect(removeHighlight(l, { p: 0, start: 0, end: 30 })).toEqual([]);
    expect(removeHighlight(l, { p: 1, start: 0, end: 30 })).toEqual(l);
  });

  it('segments text by learner highlights and evidence', () => {
    const segs = segment('abcdefghij', [{ start: 2, end: 6 }], [{ n: 3, start: 4, end: 8 }]);
    expect(segs.map((s) => [s.text, s.user, s.evidence, s.evidenceStart])).toEqual([
      ['ab', false, null, false],
      ['cd', true, null, false],
      ['ef', true, 3, true],
      ['gh', false, 3, false],
      ['ij', false, null, false],
    ]);
    expect(segs.map((s) => s.text).join('')).toBe('abcdefghij');
  });

  it('finds evidence quotes and drops overlapping ones', () => {
    expect(evidenceRanges('one two three four', [{ n: 1, quote: 'two three' }, { n: 2, quote: 'three four' }, { n: 3, quote: 'missing' }])).toEqual([{ n: 1, start: 4, end: 13 }]);
  });
});
