import { fixedSchedule, formatInterval, schedule, sm2, type CardState } from './sm2';

const NOW = new Date('2026-11-06T08:00:00Z');
const fresh: CardState = { interval_days: 0, ease_factor: 2.5, repetitions: 0, status: 'new' };

describe('sm2', () => {
  it('first answers: again 10m, hard 1d, good 1d, easy 4d', () => {
    expect(sm2(fresh, 'again', NOW)).toMatchObject({ interval_days: 0.01, repetitions: 0, ease_factor: 2.3, status: 'learning' });
    expect(sm2(fresh, 'again', NOW).due_at.toISOString()).toBe('2026-11-06T08:10:00.000Z');
    expect(sm2(fresh, 'hard', NOW)).toMatchObject({ interval_days: 1, ease_factor: 2.35, repetitions: 1, status: 'reviewing' });
    expect(sm2(fresh, 'good', NOW)).toMatchObject({ interval_days: 1, ease_factor: 2.5, repetitions: 1 });
    expect(sm2(fresh, 'easy', NOW)).toMatchObject({ interval_days: 4, ease_factor: 2.65, repetitions: 1 });
  });

  it('good grows 1d → 3d → interval × ease, and becomes mastered at 21d', () => {
    let c: CardState = fresh;
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      const s = sm2(c, 'good', NOW);
      seen.push(s.interval_days);
      c = s;
    }
    expect(seen).toEqual([1, 3, 7.5, 18.75]);
    expect(sm2(c, 'good', NOW)).toMatchObject({ interval_days: 46.88, status: 'mastered' });
  });

  it('ease never drops below 1.3', () => {
    let c: CardState = { ...fresh, ease_factor: 1.35 };
    c = sm2(c, 'again', NOW);
    expect(c.ease_factor).toBe(1.3);
  });

  it('caps very long intervals', () => {
    expect(sm2({ interval_days: 30000, ease_factor: 2.5, repetitions: 9, status: 'mastered' }, 'easy', NOW).interval_days).toBe(36500);
  });
});

describe('fixed intervals (like the sheet: 1/3/7/30 days)', () => {
  it('moves through stages', () => {
    expect(fixedSchedule(fresh, 'good', undefined, NOW)).toMatchObject({ interval_days: 3, status: 'learning' });
    expect(fixedSchedule({ ...fresh, status: 'learning' }, 'good', undefined, NOW)).toMatchObject({ interval_days: 7, status: 'reviewing' });
    expect(fixedSchedule({ ...fresh, status: 'reviewing' }, 'good', undefined, NOW)).toMatchObject({ interval_days: 30, status: 'mastered' });
    expect(fixedSchedule({ ...fresh, status: 'mastered' }, 'good', undefined, NOW)).toMatchObject({ interval_days: 30, status: 'mastered' });
  });
  it('hard stays, easy skips, again restarts', () => {
    expect(fixedSchedule({ ...fresh, status: 'learning' }, 'hard', undefined, NOW)).toMatchObject({ interval_days: 3, status: 'learning' });
    expect(fixedSchedule(fresh, 'easy', undefined, NOW)).toMatchObject({ interval_days: 7, status: 'reviewing' });
    expect(fixedSchedule({ ...fresh, status: 'mastered', repetitions: 5 }, 'again', undefined, NOW)).toMatchObject({ interval_days: 0.01, status: 'learning', repetitions: 0 });
  });
  it('uses custom intervals', () => {
    expect(schedule(fresh, 'good', { mode: 'fixed', intervals: [2, 5, 10, 60] }, NOW).interval_days).toBe(5);
  });
});

it('formats intervals for buttons', () => {
  expect([10 / 1440, 0.5, 1, 3, 20, 45, 120, 500].map(formatInterval)).toEqual(['10m', '12h', '1d', '3d', '3w', '6w', '4mo', '1.4y']);
});
