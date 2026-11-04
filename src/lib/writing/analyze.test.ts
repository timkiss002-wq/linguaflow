import { describe, expect, it } from 'vitest';
import { analyze, highlights, levelCounts, splitSentences, usesWord } from './analyze';

describe('analyze — English', () => {
  const essay = `Some people think technology makes us less social. however, i believe it depends on how we use it.

Firstly, phones are convenient because of messaging apps. For example, I talk to my family every day. Moreover, we don't feel isolated.

In conclusion, technology can help us. Technology is a tool, and technology is what we make of it.`;
  const m = analyze(essay, { language: 'en', kind: 'essay', minLength: 250, targets: ['convenient', 'isolated', 'interaction'] });

  it('counts words, sentences and paragraphs', () => {
    expect(m.length).toBe(58);
    expect(m.sentences).toBe(7);
    expect(m.paragraphs).toBe(3);
  });
  it('finds linking words without double counting', () => {
    expect(m.linkers.map((l) => l.text).sort()).toEqual(['because of', 'firstly', 'for example', 'however', 'i believe', 'in conclusion', 'moreover'].sort());
  });
  it('checks target words, including other forms', () => {
    expect(m.targetUsed).toEqual(['convenient', 'isolated']);
    expect(m.targetMissing).toEqual(['interaction']);
    expect(usesWord('She studies hard', 'study', 'en')).toBe(true);
    expect(usesWord('We are planning', 'plan', 'en')).toBe(false); // doubled consonant is not guessed
  });
  it('reports reliable issues only', () => {
    const codes = m.issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['short', 'targets', 'capital', 'lowercase-i', 'contractions', 'repetition']));
    expect(codes).not.toContain('conclusion');
    expect(codes).not.toContain('paragraphs');
    expect(m.issues.find((i) => i.code === 'repetition')!.samples).toEqual(['technology ×4']);
  });
  it('does not flag informal style in a paragraph', () => {
    const p = analyze("I can't wait. And it's fun.", { language: 'en', kind: 'paragraph', minLength: 5, targets: [] });
    expect(p.issues.map((i) => i.code)).toEqual([]);
  });
});

describe('analyze — Chinese', () => {
  const text = '我周末一般在家休息。我喜欢看电影,因为电影很有意思。我有时候和朋友去公园。我打算下个周末去爬山，所以今天要准备。';
  const hsk = new Map([['周末', 3], ['一般', 3], ['休息', 2], ['喜欢', 1], ['电影', 1], ['有意思', 2], ['朋友', 1], ['公园', 2], ['打算', 3], ['准备', 2], ['爬山', 3], ['有时候', 3]]);
  const m = analyze(text, { language: 'zh', kind: 'paragraph', minLength: 50, targets: ['周末', '有时候', '打算', '坚持'], hsk, level: 2 });

  it('counts characters and sentences', () => {
    expect(m.length).toBe(50);
    expect(m.sentences).toBe(4);
  });
  it('finds pairs and single linking words once', () => {
    expect(m.linkers.map((l) => l.text)).toEqual(['因为…所以']);
  });
  it('flags half-width punctuation and sentences that all start with 我', () => {
    const codes = m.issues.map((i) => i.code);
    expect(codes).toContain('punctuation');
    expect(codes).toContain('wo-start');
    expect(m.targetMissing).toEqual(['坚持']);
  });
  it('maps words to HSK levels and lists words above your level', () => {
    expect(m.hskLevels!['周末']).toBe(3);
    expect(m.aboveLevel).toEqual(expect.arrayContaining(['周末', '打算']));
    expect(levelCounts(m)[1]).toBeGreaterThan(0);
  });
  it('splits sentences on Chinese punctuation', () => {
    expect(splitSentences('你好！你去哪儿？我回家。', 'zh')).toEqual(['你好！', '你去哪儿？', '我回家。']);
  });
  it('detects 虽然…但是 as one pair', () => {
    const r = analyze('虽然下雨了，但是我们还是去了。', { language: 'zh', kind: 'paragraph', minLength: 5, targets: [] });
    expect(r.linkers.map((l) => l.text)).toEqual(['虽然…但是']);
  });
});

describe('highlights', () => {
  it('marks targets and linkers without overlaps', () => {
    const h = highlights('However, the ingredients are fresh.', 'en', ['ingredient'], [{ text: 'however' }]);
    expect(h.map((x) => x.kind)).toEqual(['linker', 'target']);
    expect('However, the ingredients are fresh.'.slice(h[1]!.start, h[1]!.end)).toBe('ingredients');
  });
});
