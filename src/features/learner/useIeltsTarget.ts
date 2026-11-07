import { useLearner } from './api';

/** The IELTS band the learner set as their goal (falls back to 6.5 until a goal is set). */
export function useIeltsTarget(): { band: number; isDefault: boolean } {
  const { data } = useLearner();
  const goal = data?.goals.find((g) => g.language === 'en' && g.exam === 'ielts');
  const band = goal ? Number(goal.target_level) : NaN;
  return Number.isFinite(band) ? { band, isDefault: false } : { band: 6.5, isDefault: true };
}
