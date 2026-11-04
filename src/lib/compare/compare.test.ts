import { compareChinese } from './chinese';
import { compareEnglish } from './english';
import { nextHint } from './hint';

const IGNORE = { ignorePunctuation: true };
const STRICT = { ignorePunctuation: false };
const kinds = (r: { tokens: { kind: string }[] }) => r.tokens.map((t) => t.kind);

describe('compareEnglish', () => {
  const ANSWER = "I've been working here for almost three years.";

  it('accepts a perfect answer regardless of case and spacing', () => {
    const r = compareEnglish(ANSWER, "  i've BEEN working here   for almost three years", IGNORE);
    expect(r.isCorrect).toBe(true);
    expect(r.accuracy).toBe(100);
  });

  it('accepts curly apostrophes', () => {
    expect(compareEnglish(ANSWER, 'I’ve been working here for almost three years.', STRICT).isCorrect).toBe(true);
  });

  it('separates spelling mistakes from wrong words and finds missing words', () => {
    const r = compareEnglish(ANSWER, 'I have been walking here for three yeers', IGNORE);
    expect(r.isCorrect).toBe(false);
    expect(r.counts.wrong_word).toBeGreaterThanOrEqual(1); // walking ≠ working
    expect(r.counts.misspelled).toBeGreaterThanOrEqual(1); // yeers ≈ years
    expect(r.counts.missing).toBeGreaterThanOrEqual(1); // almost
    expect(r.tokens.find((t) => t.expected === 'almost')?.kind).toBe('missing');
    expect(r.tokens.find((t) => t.expected === 'years')?.kind).toBe('misspelled');
    expect(r.tokens.find((t) => t.expected === 'working')).toMatchObject({ kind: 'wrong_word', actual: 'walking' });
  });

  it('flags extra words and lowers accuracy', () => {
    const r = compareEnglish('I like tea', 'I really like tea', IGNORE);
    expect(kinds(r)).toEqual(['correct', 'extra', 'correct', 'correct']);
    expect(r.accuracy).toBe(75);
  });

  it('counts swapped letters as one slip', () => {
    expect(compareEnglish('I receive emails', 'I recieve emails', IGNORE).counts.misspelled).toBe(1);
  });

  it('treats a missing apostrophe as spelling', () => {
    expect(compareEnglish("Don't go", 'dont go', IGNORE).counts.misspelled).toBe(1);
  });

  it('only counts punctuation when asked', () => {
    expect(compareEnglish('Hello, world.', 'hello world', IGNORE).isCorrect).toBe(true);
    const strict = compareEnglish('Hello, world.', 'hello world', STRICT);
    expect(strict.isCorrect).toBe(false);
    expect(strict.counts.punctuation).toBe(2);
    expect(strict.accuracy).toBe(100); // punctuation never affects accuracy
  });

  it('reports another form of the same word family as word_form', () => {
    const family = new Set(['decide', 'decision', 'decisive', 'decisively']);
    const sameFamily = (a: string, b: string) => a !== b && family.has(a) && family.has(b);
    const r = compareEnglish('They reached a decision quickly.', 'they reached a decisive quickly', { ignorePunctuation: true, sameFamily });
    expect(r.tokens.find((t) => t.expected === 'decision')).toMatchObject({ kind: 'word_form', actual: 'decisive' });
    // without family data it would be mislabelled as a spelling slip (75% similar)
    expect(compareEnglish('a decision', 'a decisive', IGNORE).counts.misspelled).toBe(1);
  });

  it('handles empty input', () => {
    const r = compareEnglish('Good morning', '', IGNORE);
    expect(r.accuracy).toBe(0);
    expect(r.counts.missing).toBe(2);
  });
});

describe('compareChinese', () => {
  it('accepts full-width / half-width punctuation and spaces', () => {
    expect(compareChinese('你好，我叫小明。', '你好, 我叫 小明.', STRICT).isCorrect).toBe(true);
  });

  it('classifies a homophone with the same tone as a writing (character) error', () => {
    const r = compareChinese('今天天气很好。', '今天天汽很好', IGNORE);
    expect(r.tokens.find((t) => t.expected === '气')).toMatchObject({ kind: 'wrong_character', actual: '汽' });
    expect(r.confusions).toEqual([['气', '汽']]);
  });

  it('classifies 的/得 confusion as a character error', () => {
    const r = compareChinese('他跑得很快', '他跑的很快', IGNORE);
    expect(r.counts.wrong_character).toBe(1);
  });

  it('does not call a different syllable a character error just because readings overlap', () => {
    // 不行 = bù xíng; 航 is háng (a reading 行 also has, but not here) → misheard
    expect(compareChinese('不行', '不航', IGNORE).tokens[1]?.kind).toBe('misheard');
  });

  it('classifies a wrong tone separately', () => {
    // 买 mǎi vs 卖 mài
    const r = compareChinese('我想买东西', '我想卖东西', IGNORE);
    expect(r.tokens.find((t) => t.expected === '买')?.kind).toBe('tone');
  });

  it('classifies a different syllable as mishearing', () => {
    const r = compareChinese('我们去公园吧', '我们去公司吧', IGNORE);
    expect(r.tokens.find((t) => t.expected === '园')?.kind).toBe('misheard');
  });

  it('uses context for polyphonic characters', () => {
    // 行 in 银行 is háng; typing 航 (háng) is a character error, not mishearing
    const r = compareChinese('我去银行', '我去银航', IGNORE);
    expect(r.tokens.find((t) => t.expected === '行')?.kind).toBe('wrong_character');
  });

  it('finds missing and extra characters', () => {
    const r = compareChinese('我很喜欢你', '我喜欢了你', IGNORE);
    expect(r.counts.missing).toBe(1);
    expect(r.counts.extra).toBe(1);
    expect(r.accuracy).toBeCloseTo(66.7, 1);
  });
});

describe('nextHint', () => {
  it('gives a partial clue first, then the full word, for the first wrong word', () => {
    const r = compareEnglish('I like green tea', 'I like tea', IGNORE);
    const h1 = nextHint('en', 'I like green tea', r, null);
    expect(h1).toMatchObject({ position: 3, text: 'g____', level: 1 });
    const h2 = nextHint('en', 'I like green tea', r, h1!.target);
    expect(h2).toMatchObject({ text: 'green', level: 2 });
  });

  it('gives contextual pinyin for Chinese', () => {
    const r = compareChinese('我去银行', '我去银', IGNORE);
    expect(nextHint('zh', '我去银行', r, null)).toMatchObject({ position: 4, text: 'háng' });
  });

  it('returns null when everything is right', () => {
    expect(nextHint('en', 'Hi there', compareEnglish('Hi there', 'hi there', IGNORE), null)).toBeNull();
  });
});
