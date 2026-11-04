import type { VocabWord } from '@/features/vocabulary/api';
import { buildReviewQueue, forecast } from './queue';

const NOW = new Date('2026-11-06T10:00:00');
const w = (term: string, extra: Partial<VocabWord> = {}) =>
  ({ id: term, term, language: 'en', repetitions: 0, last_reviewed_at: null, due_at: '2026-11-01T00:00:00', created_at: '2026-11-01T00:00:00', ...extra }) as VocabWord;

const words = [
  w('new-old', { created_at: '2026-10-01T00:00:00' }),
  w('new-newer', { created_at: '2026-11-05T00:00:00' }),
  w('due-recent', { repetitions: 2, last_reviewed_at: '2026-11-01T00:00:00', due_at: '2026-11-06T09:00:00' }),
  w('due-overdue', { repetitions: 3, last_reviewed_at: '2026-10-01T00:00:00', due_at: '2026-11-02T00:00:00' }),
  w('later', { repetitions: 1, last_reviewed_at: '2026-11-05T00:00:00', due_at: '2026-11-08T12:00:00' }),
  w('again-learning', { repetitions: 0, last_reviewed_at: '2026-11-06T09:55:00', due_at: '2026-11-06T09:59:00' }),
  w('超市', { language: 'zh' }),
];

it('puts due cards first (most overdue), then new cards up to the daily limit', () => {
  const { queue, counts } = buildReviewQueue(words, { language: 'en', newLimit: 20, newDoneToday: 0, now: NOW });
  expect(queue.map((x) => x.term)).toEqual(['due-overdue', 'due-recent', 'again-learning', 'new-old', 'new-newer']);
  expect(counts).toEqual({ due: 3, newAvailable: 2, newLeftToday: 2, total: 6 });
});

it('respects the remaining new-card allowance', () => {
  const { queue, counts } = buildReviewQueue(words, { language: 'en', newLimit: 3, newDoneToday: 2, now: NOW });
  expect(queue.map((x) => x.term)).toEqual(['due-overdue', 'due-recent', 'again-learning', 'new-old']);
  expect(counts.newLeftToday).toBe(1);
});

it('forecasts the next days', () => {
  const f = forecast(words, 'en', 3, NOW);
  expect(f.map((d) => d.count)).toEqual([0, 1, 0]);
});
