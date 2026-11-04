/** All SRS constants in one place so the schedule is easy to explain and tune. */
export const SRS = {
  /** "Again": show the card again after 10 minutes. */
  againMinutes: 10,
  startEase: 2.5,
  minEase: 1.3,
  againEaseDelta: -0.2,
  hardEaseDelta: -0.15,
  easyEaseDelta: 0.15,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  /** Intervals (days) for the first answers of a new card. */
  firstGood: 1,
  secondGood: 3,
  firstEasy: 4,
  /** A card is "mastered" once its interval reaches this many days. */
  masteredDays: 21,
  maxDays: 36500,
} as const;

/** Default fixed intervals, same as the learner's Google Sheet: New 1, Learning 3, Reviewing 7, Mastered 30. */
export const DEFAULT_FIXED_INTERVALS = [1, 3, 7, 30] as const;
