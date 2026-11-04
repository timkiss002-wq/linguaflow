import { describe, expect, it } from 'vitest';
import { buildDrill } from './drill';

describe('buildDrill', () => {
  it('makes a cloze only for same-sound pairs found in their sentence', () => {
    const items = buildDrill([
      { language: 'zh', expected: '汽', typed: '气', count: 1, sentence: '我坐汽车去上班。' },
      { language: 'zh', expected: '买', typed: '卖', count: 1, sentence: '我想去超市买东西。' }, // tone, not same sound
      { language: 'zh', expected: '是', typed: '事', count: 1, sentence: '' }, // no sentence
      { language: 'en', expected: 'their', typed: 'there', count: 1, sentence: 'their house' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ before: '我坐', after: '车去上班。', answer: '汽' });
    expect([...items[0]!.options].sort()).toEqual(['气', '汽']);
  });
});
