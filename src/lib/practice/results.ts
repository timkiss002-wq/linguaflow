/**
 * Best score of each daily practice task of the path ("Dịch ví dụ", "Sửa lỗi sai", "Câu chuẩn S-V-O"), kept in this
 * browser like the grammar progress, keyed by the task id (`${date}:${kind}`).
 */

export interface PracticeResult {
  best: number;
  total: number;
  at: string;
}

export const PRACTICE_KEY = 'roadmap:practice:v1';
export const PRACTICE_PASS = 0.8;

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
  return Boolean(r && r.total > 0 && r.best / r.total >= PRACTICE_PASS);
};

/** Keeps the best score only. */
export function savePractice(taskId: string, score: number, total: number) {
  const all = readPractice();
  const old = all[taskId];
  if (old && old.total === total && old.best >= score) return;
  all[taskId] = { best: score, total, at: new Date().toISOString() };
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}
