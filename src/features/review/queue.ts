import type { VocabWord } from '@/features/vocabulary/api';

/** A card is new to spaced review until it has been rated once (repetitions stays 0 after "Again"). */
export const isNewCard = (w: VocabWord) => w.repetitions === 0 && !w.last_reviewed_at;

export interface DeckCounts {
  due: number;
  newAvailable: number;
  newLeftToday: number;
  total: number;
}

/**
 * Today's review queue for one language: cards already in review that are due (most overdue first),
 * then new cards (oldest saved first) up to the daily limit.
 */
export function buildReviewQueue(words: VocabWord[], opts: { language: 'en' | 'zh'; newLimit: number; newDoneToday: number; now?: Date }): { queue: VocabWord[]; counts: DeckCounts } {
  const now = (opts.now ?? new Date()).getTime();
  const mine = words.filter((w) => w.language === opts.language);
  const due = mine.filter((w) => !isNewCard(w) && new Date(w.due_at).getTime() <= now).sort((a, b) => a.due_at.localeCompare(b.due_at));
  const fresh = mine.filter(isNewCard).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const newLeftToday = Math.max(0, opts.newLimit - opts.newDoneToday);
  const newCards = fresh.slice(0, newLeftToday);
  return {
    queue: [...due, ...newCards],
    counts: { due: due.length, newAvailable: fresh.length, newLeftToday: newCards.length, total: mine.length },
  };
}

/** Cards coming due on each of the next `days` days (local time), for the forecast. */
export function forecast(words: VocabWord[], language: 'en' | 'zh', days = 7, now = new Date()): { date: Date; count: number }[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const out = Array.from({ length: days }, (_, i) => ({ date: new Date(start.getTime() + (i + 1) * 86_400_000), count: 0 }));
  for (const w of words) {
    if (w.language !== language || isNewCard(w)) continue;
    const t = new Date(w.due_at).getTime();
    const day = Math.floor((t - start.getTime()) / 86_400_000) - 1;
    if (day >= 0 && day < days) out[day]!.count += 1;
  }
  return out;
}
