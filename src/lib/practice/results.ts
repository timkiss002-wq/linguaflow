/**
 * Best score of each daily practice task of the path ("Dịch ví dụ", "Sửa lỗi sai", "Câu chuẩn S-V-O"), kept in this
 * browser like the grammar progress, keyed by the task id (`${date}:${kind}`).
 */

export interface PracticeResult {
  best: number;
  total: number;
  at: string;
  /** passed under the shared rule (lib/practice/retry): ≥ 50 % first try, or the wrong sentences redone */
  passed?: boolean;
}

export const PRACTICE_KEY = 'roadmap:practice:v1';
export const PRACTICE_PASS = 0.5;

export function readPractice(): Record<string, PracticeResult> {
  try {
    return JSON.parse(localStorage.getItem(PRACTICE_KEY) ?? '{}') as Record<string, PracticeResult>;
  } catch {
    return {};
  }
}

export const practiceOf = (taskId: string) => readPractice()[taskId];

export const practicePassed = (taskId: string) => {
  const r = practiceOf(taskId);
  if (!r) return false;
  return Boolean(r.passed) || (r.total > 0 && r.best / r.total >= PRACTICE_PASS);
};

/** Keeps the best score; once passed, stays passed. */
export function savePractice(taskId: string, score: number, total: number, passed = total > 0 && score / total >= PRACTICE_PASS) {
  const all = readPractice();
  const old = all[taskId];
  const wasPassed = Boolean(old && (old.passed || (old.total > 0 && old.best / old.total >= PRACTICE_PASS)));
  if (old && old.total === total && old.best >= score && (wasPassed || !passed)) return;
  const best = old && old.total === total ? Math.max(old.best, score) : score;
  all[taskId] = { best, total, at: new Date().toISOString(), passed: passed || wasPassed };
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
