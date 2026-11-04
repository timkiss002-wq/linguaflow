import { describe, expect, it } from 'vitest';
import type { Insight } from './insights';
import { buildPlan, countSkips, focusLanguage, itemProgress, type PlanInput } from './plan';

// 2026-11-04 is a Wednesday (3)
const base: PlanInput = {
  today: '2026-11-04',
  goalMinutes: 20,
  studyDays: [1, 2, 3, 4, 5],
  dueCards: 30,
  goals: [{ language: 'zh', examDate: null }],
  tests: { zh: { state: 'ok' } },
  insights: [],
  missedPoints: [],
  lessons: { zh: { id: 'L1', title: 'Weekend plans', language: 'zh', remaining: 8, continue: false, reasons: ['one step above your level'] } },
  levelSource: { zh: 'listening HSK 3 from your level test' },
  skips: {},
  avgSessionMinutes: null,
};
const tones: Insight = { id: 'zh-tones', kind: 'weakness', area: 'sounds', language: 'zh', title: 'Tones', detail: 'You pick the wrong tone.', evidence: '10 of 12 wrong characters' };
const leeches: Insight = { id: 'leeches', kind: 'weakness', area: 'vocabulary', title: 'Words you keep forgetting', detail: 'Forgotten again and again.', evidence: '3 words', action: { label: 'x', href: '/vocabulary/practice?ids=a,b' } };

describe('buildPlan', () => {
  it('fits the daily goal: reviews (≤ 40%), then a lesson with the rest', () => {
    const p = buildPlan(base);
    expect(p.items.map((i) => i.kind)).toEqual(['review', 'lesson']);
    expect(p.items[0]).toMatchObject({ minutes: 8, target: { type: 'reviews', count: 30 } });
    expect(p.items[1]).toMatchObject({ minutes: 12, target: { type: 'sentences', lessonId: 'L1', count: 8 } });
    expect(p.items.reduce((n, i) => n + i.minutes, 0)).toBe(20);
    expect(p.items[1]!.reason).toBe('One step above your level — listening HSK 3 from your level test');
  });

  it('caps reviews and says how many of the due cards', () => {
    const p = buildPlan({ ...base, dueCards: 100 });
    expect(p.items[0]!.title).toBe('Review 32 of 100 flashcards');
  });

  it('adds a weak spot and uses listening patterns as the lesson focus', () => {
    const p = buildPlan({ ...base, insights: [tones, leeches] });
    expect(p.items.map((i) => i.key)).toEqual(['review', 'practice-leeches', 'lesson-L1']);
    expect(p.items[1]).toMatchObject({ minutes: 5, href: '/vocabulary/practice?ids=a,b', target: { type: 'practice', count: 5 } });
    expect(p.items[1]!.reason).toContain('3 words');
    expect(p.items[2]!.detail).toContain("Today's focus — tones");
  });

  it('rotates weak spots by day and shortens what is often skipped', () => {
    const missed = [{ language: 'zh' as const, code: 'zh-ba', name: '把 sentences', vi: 'Câu chữ 把…', testId: 'T1' }];
    const a = buildPlan({ ...base, insights: [leeches], missedPoints: missed });
    const b = buildPlan({ ...base, today: '2026-11-05', insights: [leeches], missedPoints: missed });
    expect(new Set([a.items[1]!.kind, b.items[1]!.kind])).toEqual(new Set(['grammar', 'practice']));
    const g = [a, b].map((p) => p.items[1]!).find((i) => i.kind === 'grammar')!;
    expect(g).toMatchObject({ detail: 'Câu chữ 把…', href: '/level-test/T1', target: { type: 'manual' } });
    const short = buildPlan({ ...base, insights: [leeches], skips: { practice: 3 } });
    expect(short.items[1]).toMatchObject({ minutes: 3 });
    expect(short.items[1]!.reason).toContain('often skip');
  });

  it('puts a level test in when one is missing, open or due', () => {
    expect(buildPlan({ ...base, tests: { zh: { state: 'none' } } }).items[1]).toMatchObject({ key: 'test-zh', minutes: 12, href: '/level-test' });
    expect(buildPlan({ ...base, tests: { zh: { state: 'open', openId: 'X' } } }).items[1]).toMatchObject({ href: '/level-test/X' });
    expect(buildPlan({ ...base, tests: { zh: { state: 'due' } } }).items[1]).toMatchObject({ minutes: 6, title: 'Chinese check-in (10 questions)' });
  });

  it('keeps rest days light', () => {
    const sunday = buildPlan({ ...base, today: '2026-11-08' });
    expect(sunday.restDay).toBe(true);
    expect(sunday.items.map((i) => i.kind)).toEqual(['review']);
    expect(buildPlan({ ...base, today: '2026-11-08', dueCards: 0 }).items).toEqual([]);
  });

  it('continues a started lesson and notes habits', () => {
    const p = buildPlan({ ...base, dueCards: 0, avgSessionMinutes: 8, lessons: { zh: { ...base.lessons.zh!, continue: true, remaining: 3 } } });
    expect(p.items[0]).toMatchObject({ title: 'Continue: Weekend plans · 3 sentences', minutes: 20 });
    expect(p.notes[0]).toContain('about 8 min');
  });

  it('works without goals', () => {
    const p = buildPlan({ ...base, goals: [], lessons: {} });
    expect(p.items.map((i) => i.kind)).toEqual(['review']);
    expect(p.notes[0]).toContain('learning profile');
  });
});

describe('focusLanguage', () => {
  const goals = [{ language: 'en' as const, examDate: null }, { language: 'zh' as const, examDate: null }];
  it('alternates by day, but a near exam wins', () => {
    expect(focusLanguage({ goals, today: '2026-11-04' })).not.toBe(focusLanguage({ goals, today: '2026-11-05' }));
    const exam = [{ language: 'en' as const, examDate: '2027-06-01' }, { language: 'zh' as const, examDate: '2026-12-01' }];
    expect(focusLanguage({ goals: exam, today: '2026-11-04' })).toBe('zh');
    expect(focusLanguage({ goals: exam, today: '2026-11-05' })).toBe('zh');
  });
});

describe('progress', () => {
  it('ticks items off from what was done today', () => {
    const p = buildPlan(base);
    const today = { reviews: 15, sentences: { L1: 8 }, practice: 0, word_forms: 0, tests: [] };
    expect(itemProgress(p.items[0]!, today)).toBe(0.5);
    expect(itemProgress(p.items[1]!, today)).toBe(1);
  });
  it('counts skips per kind', () => {
    const p = buildPlan(base);
    expect(countSkips([{ items: p.items, status: { review: 'skipped', [p.items[1]!.key]: 'done' } }])).toEqual({ review: 1 });
  });
});
