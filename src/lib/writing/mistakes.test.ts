import { bandHistory, bandSummary, checkFix, drillItems, recurringMistakes, type FeedbackEntry } from './mistakes';
import type { Feedback } from '../../../supabase/functions/_shared/writing-feedback.ts';

const fb = (overall: number, corrections: [string, string, string][], grammar = overall): Feedback => ({
  language: 'en',
  criteria: [
    { key: 'task', label: 'Task response', score: overall, max: 9, comment_vi: '' },
    { key: 'grammar', label: 'Grammatical range & accuracy', score: grammar, max: 9, comment_vi: '' },
  ],
  overall: { score: overall, max: 9, label: `Band ${overall}` },
  summary_vi: '',
  strengths_vi: [],
  priorities_vi: [],
  corrections: corrections.map(([original, corrected, category]) => ({ original, corrected, category, explanation_vi: 'vì…' })),
  rewrite: '',
});
const entry = (id: string, day: number, f: Feedback, exam = false): FeedbackEntry => ({ submissionId: id, title: id, createdAt: `2026-11-0${day}T10:00:00Z`, exam, feedback: f });

const entries = [
  entry('a', 1, fb(5.5, [['people is', 'people are', 'agreement'], ['in the other hand', 'on the other hand', 'preposition'], ['same', 'same', 'other']], 5)),
  entry('b', 2, fb(6, [['peoples is', 'people are', 'agreement'], ['make a research', 'do research', 'collocation']], 5.5)),
  entry('c', 3, fb(6.5, [['People is', 'People are', 'agreement'], ['a important', 'an important', 'article']], 6), true),
  { ...entry('z', 4, fb(4, [['我是', '我是', 'other']])), feedback: { ...fb(4, []), language: 'zh' as const } },
];

describe('recurringMistakes', () => {
  it('ranks categories by the number of texts they appear in, ignoring non-corrections and Chinese', () => {
    const r = recurringMistakes(entries);
    expect(r.map((x) => x.category)).toEqual(['agreement', 'article', 'collocation', 'preposition']);
    expect(r[0]).toMatchObject({ count: 3, texts: 3 });
    expect(r[0]!.examples[0]!.submissionId).toBe('c');
  });
});

describe('band history', () => {
  it('is English only, oldest first, with the criteria', () => {
    const h = bandHistory(entries);
    expect(h.map((x) => x.submissionId)).toEqual(['a', 'b', 'c']);
    expect(h[2]).toMatchObject({ overall: 6.5, exam: true, criteria: { task: 6.5, grammar: 6 } });
  });
  it('summarises the recent average, the change and the weakest criterion', () => {
    const s = bandSummary(bandHistory(entries), 1);
    expect(s).toEqual({ recent: 6.5, change: 0.5, weakest: 'grammar' });
    expect(bandSummary(bandHistory(entries), 3).change).toBeNull();
  });
});

describe('drill', () => {
  it('one item per distinct original, newest first, filterable', () => {
    const all = drillItems(entries);
    expect(all.map((d) => d.original)).toEqual(['People is', 'a important', 'peoples is', 'make a research', 'in the other hand']);
    expect(drillItems(entries, 'article').map((d) => d.corrected)).toEqual(['an important']);
  });
  it('accepts the correction, punctuation aside', () => {
    expect(checkFix('do research.', { corrected: 'do research' }).ok).toBe(true);
    expect(checkFix('make research', { corrected: 'do research' }).ok).toBe(false);
  });
});
