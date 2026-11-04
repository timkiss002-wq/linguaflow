import { DEFAULT_FIXED_INTERVALS, SRS } from './config';

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];
export type CardStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface CardState {
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  status: CardStatus;
}

export interface Schedule {
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  status: CardStatus;
  due_at: Date;
}

export type SrsMode = { mode: 'sm2' } | { mode: 'fixed'; intervals: readonly number[] };

const round2 = (n: number) => Math.round(n * 100) / 100;
const clampEase = (e: number) => round2(Math.max(SRS.minEase, e));
const statusFor = (interval: number): CardStatus => (interval < 1 ? 'learning' : interval >= SRS.masteredDays ? 'mastered' : 'reviewing');
const addDays = (now: Date, days: number) => new Date(now.getTime() + days * 86_400_000);

/**
 * SM-2 variant (like Anki):
 *  - Again → 10 minutes, ease −0.20, repetitions reset.
 *  - Hard  → 1 day for a new card, else interval × 1.2; ease −0.15.
 *  - Good  → 1 day, then 3 days, then interval × ease.
 *  - Easy  → 4 days for a new card, else interval × ease × 1.3; ease +0.15.
 */
export function sm2(card: CardState, rating: Rating, now = new Date()): Schedule {
  const ease = card.ease_factor || SRS.startEase;
  const reps = card.repetitions;
  let interval: number;
  let nextEase = ease;
  let nextReps = reps + 1;

  switch (rating) {
    case 'again':
      interval = SRS.againMinutes / 1440;
      nextEase = ease + SRS.againEaseDelta;
      nextReps = 0;
      break;
    case 'hard':
      interval = reps === 0 ? 1 : Math.max(1, card.interval_days * SRS.hardMultiplier);
      nextEase = ease + SRS.hardEaseDelta;
      break;
    case 'good':
      interval = reps === 0 ? SRS.firstGood : reps === 1 ? SRS.secondGood : Math.max(SRS.secondGood, card.interval_days * ease);
      break;
    case 'easy':
      interval = reps === 0 ? SRS.firstEasy : Math.max(SRS.firstEasy, card.interval_days * ease * SRS.easyBonus);
      nextEase = ease + SRS.easyEaseDelta;
      break;
  }
  interval = Math.min(interval, SRS.maxDays);
  // Due date from the exact interval; only the stored number is rounded (10 min ≠ 0.01 day).
  return { interval_days: round2(interval), ease_factor: clampEase(nextEase), repetitions: nextReps, status: statusFor(interval), due_at: addDays(now, interval) };
}

const STAGES: CardStatus[] = ['new', 'learning', 'reviewing', 'mastered'];

/**
 * Fixed intervals like the learner's sheet: each status has its own wait (default 1/3/7/30 days).
 * Again → back to the first stage (seen again in 10 minutes); Hard → same stage; Good → next stage;
 * Easy → skip a stage.
 */
export function fixedSchedule(card: CardState, rating: Rating, intervals: readonly number[] = DEFAULT_FIXED_INTERVALS, now = new Date()): Schedule {
  const current = Math.max(0, STAGES.indexOf(card.status));
  const stage = rating === 'again' ? 0 : rating === 'hard' ? current : rating === 'good' ? Math.min(current + 1, 3) : Math.min(current + 2, 3);
  const interval = rating === 'again' ? SRS.againMinutes / 1440 : intervals[stage] ?? intervals[intervals.length - 1]!;
  const status: CardStatus = rating === 'again' ? 'learning' : STAGES[Math.max(stage, 1)]!;
  return {
    interval_days: round2(interval),
    ease_factor: card.ease_factor || SRS.startEase,
    repetitions: rating === 'again' ? 0 : card.repetitions + 1,
    status,
    due_at: addDays(now, interval),
  };
}

export function schedule(card: CardState, rating: Rating, mode: SrsMode, now = new Date()): Schedule {
  return mode.mode === 'fixed' ? fixedSchedule(card, rating, mode.intervals, now) : sm2(card, rating, now);
}

/** "10m", "1d", "3d", "2w", "3mo", "1.5y" — shown on the rating buttons. */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.round(days * 1440)}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 14) return `${Math.round(days)}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round((days / 365) * 10) / 10}y`;
}
