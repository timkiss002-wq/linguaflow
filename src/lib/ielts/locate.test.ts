import { describe, expect, it } from 'vitest';
import { TESTS } from './tests';
import { locateQuote, locationLabel, sentenceWith, splitSentences } from './locate';

describe('splitSentences', () => {
  it('splits on . ! ? and keeps offsets', () => {
    const t = 'Rats dream. Do pigeons? Yes! They do.';
    const s = splitSentences(t);
    expect(s.map((x) => x.text)).toEqual(['Rats dream.', 'Do pigeons?', 'Yes!', 'They do.']);
    expect(t.slice(s[1]!.start, s[1]!.end)).toBe('Do pigeons?');
  });
  it('does not break on abbreviations or decimals', () => {
    const s = splitSentences('Costs rose by 2.5 per cent, e.g. in Paris. Dr. Lee disagreed.');
    expect(s.map((x) => x.text)).toEqual(['Costs rose by 2.5 per cent, e.g. in Paris.', 'Dr. Lee disagreed.']);
  });
});

describe('locateQuote', () => {
  const paras = [
    ['A', 'First point. Second point about rats running a maze. Third.'],
    ['B', 'Whales sleep with half their brain awake. They show no REM sleep.'],
  ];
  it('finds the paragraph, sentence number and whole sentence', () => {
    const loc = locateQuote(paras, 'half their brain awake')!;
    expect(loc.label).toBe('B');
    expect(loc.sentences).toEqual([1]);
    expect(loc.sentence).toBe('Whales sleep with half their brain awake.');
    expect(locationLabel(loc)).toBe('Đoạn B, câu 1');
  });
  it('spans two sentences and numbers unlabelled paragraphs', () => {
    const loc = locateQuote([[null, 'One here. Two here. Three.']], 'here. Two')!;
    expect(loc.sentences).toEqual([1, 2]);
    expect(locationLabel(loc)).toBe('Đoạn 1, câu 1–2');
  });
  it('returns null when the quote is not verbatim', () => {
    expect(locateQuote(paras, 'half of their brain')).toBeNull();
  });
  it('locates every reading evidence quote in the shipped tests', () => {
    for (const t of TESTS.filter((x) => x.skill === 'reading'))
      for (const p of t.parts)
        for (const g of p.groups)
          for (const q of g.questions) expect(locateQuote(p.paragraphs!, q.evidence), `${t.id} q${q.n}`).not.toBeNull();
  });
});

describe('sentenceWith', () => {
  it('works on a plain passage with newlines', () => {
    expect(sentenceWith('Para one ends.\n\nHis warning has been largely ignored. Critics argue.', 'largely ignored')).toBe('His warning has been largely ignored.');
    expect(sentenceWith('Nothing here.', 'absent')).toBeNull();
  });
});
