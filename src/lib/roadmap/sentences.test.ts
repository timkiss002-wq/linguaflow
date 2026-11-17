import { savePractice } from '@/lib/practice/results';
import { describe, expect, it } from 'vitest';
import { ACTIVE_PER_DAY, ACTIVE_TOPICS, DAYS, GRAMMAR_SEQUENCE, activeWordsOf } from './plan';
import { dayLock, isDone, lessonsOf, nextOpenDay, setManualDone, type Context } from './progress';
import { checkSentences, saveSentences, usesPhrase } from './sentences';

describe('active vocabulary on the path', () => {
  const tasks = DAYS.flatMap((d) => d.tasks.filter((t) => t.kind === 'vocab-active').map((t) => ({ d, t })));

  it('gives 5 collocations of the week topic on Monday–Saturday, never repeating one', () => {
    expect(tasks.length).toBeGreaterThan(80);
    const seen = new Set<string>();
    for (const { d, t } of tasks) {
      expect(d.weekday, d.date).not.toBe(0);
      expect(d.light, d.date).toBeFalsy();
      expect(activeWordsOf(t)).toHaveLength(ACTIVE_PER_DAY);
      expect(ACTIVE_TOPICS.find((x) => x.id === t.active!.topic)!.week).toBe(d.week);
      expect(t.active!.prompt.length).toBeGreaterThan(30);
      for (const w of activeWordsOf(t)) {
        expect(seen.has(`${t.active!.topic}:${w.t}`)).toBe(false);
        seen.add(`${t.active!.topic}:${w.t}`);
      }
    }
  });

  it('has every collocation with a meaning and an example that uses it', () => {
    for (const topic of ACTIVE_TOPICS) for (const w of topic.words) expect(usesPhrase(w.ex, w.t), `${topic.id}: ${w.t} / ${w.ex}`).toBe(true);
  });
});

describe('usesPhrase', () => {
  it('accepts inflected and irregular forms, in one sentence', () => {
    expect(usesPhrase('The number of visitors rose sharply.', 'rise sharply')).toBe(true);
    expect(usesPhrase('Factories made up half of the area.', 'make up')).toBe(true);
    expect(usesPhrase('Governments are imposing stricter regulations on firms.', 'impose strict regulations on')).toBe(true);
    expect(usesPhrase('It doubled in ten years.', 'double / triple')).toBe(true);
    expect(usesPhrase('Prices rose. It was sharp.', 'rise sharply')).toBe(false);
    expect(usesPhrase('We should protect forests.', 'protect endangered species')).toBe(false);
  });

  it('passes only with 3–5 sentences and all phrases used (or ticked by hand)', () => {
    const phrases = ['tackle climate change', 'renewable energy sources'];
    const two = 'We must tackle climate change. Renewable energy sources are cheap.';
    expect(checkSentences(two, phrases).passed).toBe(false);
    const three = `${two} I agree.`;
    expect(checkSentences(three, phrases).passed).toBe(true);
    expect(checkSentences('A b. C d. E f.', phrases, phrases).passed).toBe(true);
    expect(checkSentences('A. B. C. D. E. F.', phrases, phrases).passed).toBe(false);
  });
});

describe('linear unlock instead of a calendar lock', () => {
  const ctx: Context = { notebook: () => ({ inNotebook: true, practised: true }), p3Days: new Set() };
  const today = '2026-11-16';
  const day = (date: string) => DAYS.find((d) => d.date === date)!;

  it('opens today, keeps tomorrow closed until today is learned, then opens it', () => {
    const all = Object.fromEntries(GRAMMAR_SEQUENCE.map((t) => [t, { best: 8, total: 8 }]));
    localStorage.setItem('grammar:progress', JSON.stringify(all));
    localStorage.setItem('grammar:quiz', JSON.stringify(all));
    expect(dayLock(day(today), ctx, today)).toBeUndefined();
    expect(dayLock(day('2026-11-17'), ctx, today)).toBeDefined();
    for (const t of lessonsOf(day(today))) {
      if (t.kind === 'vocab-active') saveSentences(today, { text: '', manual: [], savedAt: '', passed: true });
      else if (t.kind === 'vocab-translate' || t.kind === 'grammar-fix' || t.kind === 'grammar-svo') savePractice(t.id, 10, 10);
      else if (!isDone(t, ctx)) setManualDone(t.id, true);
    }
    expect(lessonsOf(day(today)).every((t) => isDone(t, ctx))).toBe(true);
    expect(dayLock(day('2026-11-17'), ctx, today)).toBeUndefined();
    expect(nextOpenDay(ctx, today)?.date).toBe('2026-11-17');
    expect(dayLock(day('2026-11-18'), ctx, today)).toBeDefined();
  });

  it('never opens a future day while something of a past day is owed', () => {
    expect(dayLock(day('2026-11-18'), ctx, '2026-11-17')).toBeDefined();
    expect(nextOpenDay(ctx, '2026-11-17')).toBeUndefined();
  });
});
