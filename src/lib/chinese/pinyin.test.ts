import { groupForWrapping, toPinyin, toRubyTokens } from './pinyin';

describe('toRubyTokens', () => {
  it('gives one syllable per Han character and none for punctuation', () => {
    const t = toRubyTokens('天气很好。');
    expect(t.map((x) => x.pinyin)).toEqual(['tiān', 'qì', 'hěn', 'hǎo', null]);
  });
  it('resolves polyphonic characters from context', () => {
    const py = toRubyTokens('我还要去银行').map((x) => x.pinyin);
    expect(py[1]).toBe('hái');
    expect(py[5]).toBe('háng');
    expect(toRubyTokens('很重要')[1]?.pinyin).toBe('zhòng');
  });
  it('uses a manual override only when it lines up', () => {
    expect(toRubyTokens('行', 'xíng')[0]?.pinyin).toBe('xíng');
    expect(toRubyTokens('天气', 'only-one')[0]?.pinyin).toBe('tiān');
  });
});

it('builds plain pinyin', () => {
  expect(toPinyin('你好', 'none')).toBe('ni hao');
});

it('keeps punctuation with its neighbour', () => {
  const groups = groupForWrapping(toRubyTokens('他说：“好。”')).map((g) => g.map((t) => t.text).join(''));
  expect(groups).toEqual(['他', '说：', '“好。”']);
});
