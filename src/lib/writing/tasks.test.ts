import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { compareWithPrevious, pickTasks, targetWords, type WritingTask } from './tasks';

const t = (id: string, p: Partial<WritingTask>): WritingTask => ({
  id, language: 'en', kind: 'paragraph', exam: 'general', level_min: 3, level_max: 4, topic: null, title: id, prompt: '', prompt_vi: null, min_length: 50, max_length: null, words: ['a1', 'a2', 'a3', 'a4', 'a5'], ...p,
});

describe('pickTasks', () => {
  const tasks = [
    t('food', { topic: 'food' }),
    t('ielts', { exam: 'ielts', level_min: 4, level_max: 6 }),
    t('plain', {}),
    t('hard', { level_min: 6, level_max: 6 }),
    t('zh', { language: 'zh' }),
  ];
  it('ranks by level, interests and exam, and explains why', () => {
    const p = pickTasks(tasks, { language: 'en', level: 3, interests: ['food'], exam: 'ielts', recent: new Set(), today: '2026-11-04' });
    expect(p.map((x) => x.task.id)).toEqual(['food', 'ielts', 'plain']);
    expect(p[0]!.reasons).toEqual(['at your level', 'you like food']);
    expect(p[1]!.reasons).toEqual(['a step up', 'IELTS format']);
  });
  it('pushes prompts written recently down', () => {
    const p = pickTasks(tasks, { language: 'en', level: 3, interests: ['food'], exam: null, recent: new Set(['food']), today: '2026-11-04' });
    expect(p[0]!.task.id).toBe('plain');
  });
});

describe('targetWords', () => {
  it('puts two notebook words first', () => {
    expect(targetWords(t('x', {}), ['commute', 'hobby', 'a1', 'salary'])).toEqual({ words: ['commute', 'hobby', 'a1', 'a2', 'a3'], fromNotebook: ['commute', 'hobby'] });
  });
  it('keeps HSK prompts exactly as in the exam', () => {
    expect(targetWords(t('h', { exam: 'hsk' }), ['超市']).words).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
  });
});

describe('compareWithPrevious', () => {
  it('compares with the average of earlier texts', () => {
    const a = analyze('I like food. I like rice.', { language: 'en', kind: 'paragraph', minLength: 1, targets: [] });
    const b = analyze('Firstly, I cook. However, my brother eats. In conclusion, we share.', { language: 'en', kind: 'paragraph', minLength: 1, targets: [] });
    expect(compareWithPrevious(b, [])).toBeNull();
    const c = compareWithPrevious(b, [a])!;
    expect(c.linkerKinds).toBe(3);
    expect(c.count).toBe(1);
  });
});
