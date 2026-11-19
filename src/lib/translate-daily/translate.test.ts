import { describe, expect, it } from 'vitest';
import { checkWrite } from '@/lib/practice/items';
import { dayByDate } from '@/lib/roadmap/plan';
import {
  DIALOGUES,
  LEVEL_DAYS,
  STORIES,
  TAGS,
  applyResults,
  dialogueItems,
  emptyLog,
  levelOf,
  lineKey,
  pickDialogues,
  pickStory,
  storyItems,
  weakTags,
} from './index';

describe('translation content', () => {
  it('has dialogues and stories for every level, 4 lines per dialogue', () => {
    for (let l = 1; l <= 6; l++) {
      expect(DIALOGUES.filter((d) => d.level === l).length, `dialogues level ${l}`).toBeGreaterThanOrEqual(12);
      expect(STORIES.filter((s) => s.level === l).length, `stories level ${l}`).toBeGreaterThanOrEqual(5);
    }
    for (const d of DIALOGUES) expect(d.lines.length, d.id).toBe(4);
    for (const s of STORIES) expect(s.lines.length, s.id).toBeGreaterThanOrEqual(5);
  });
  it('every line has known grammar points, and every accepted answer is checked as correct', () => {
    for (const p of [...DIALOGUES, ...STORIES])
      for (const l of p.lines) {
        expect(l.t.length, l.vi).toBeGreaterThan(0);
        for (const t of l.t) expect(TAGS[t], `${p.id}: ${t}`).toBeTruthy();
        const item = { key: 'x', prompt: l.vi, en: l.en };
        for (const a of l.en) expect(checkWrite(item, a, false).verdict, a).toBe('correct');
      }
  });
  it('a missing grammar ending is a mistake, not a spelling slip', () => {
    const items = dialogueItems(pickDialogues('2026-11-19', emptyLog(), {}));
    const item = { ...items[0]!, en: ['My father is an engineer. He works in a factory.'] };
    expect(checkWrite(item, 'My father is an engineer. He work in a factory.', false).verdict).toBe('wrong');
    expect(checkWrite(item, 'My father is a engineer. He works in a factory.', false).verdict).toBe('wrong');
    expect(checkWrite(item, 'My father is an enginer. He works in a factory.', false).verdict).toBe('spelling');
    expect(checkWrite({ ...item, en: ['There are two bedrooms.'] }, 'There are two bedroom.', false).verdict).toBe('wrong');
    expect(checkWrite({ ...item, en: ['I watched a film.'] }, 'I watch a film.', false).verdict).toBe('wrong');
  });
  it('levels go up every two weeks and stop at 6', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(LEVEL_DAYS - 1)).toBe(1);
    expect(levelOf(LEVEL_DAYS)).toBe(2);
    expect(levelOf(500)).toBe(6);
  });
});

describe('daily choice', () => {
  it('gives 20 lines on the first day, all from level 1', () => {
    const set = pickDialogues('2026-11-19', emptyLog(), {});
    const items = dialogueItems(set);
    expect(items).toHaveLength(20);
    expect(set.dialogues).toHaveLength(4);
    for (const id of [...set.dialogues, set.bonus!]) expect(DIALOGUES.find((d) => d.id === id)!.level).toBe(1);
    expect(new Set(items.map((i) => i.key)).size).toBe(20);
  });
  it('moves on to dialogues not given yet', () => {
    const first = pickDialogues('2026-11-19', emptyLog(), {});
    const seen = Object.fromEntries([...first.dialogues, first.bonus!].map((id) => [id, '2026-11-19']));
    const second = pickDialogues('2026-11-20', emptyLog(), seen);
    for (const id of second.dialogues.slice(0, 3)) expect(first.dialogues).not.toContain(id);
  });
  it('brings back lines answered wrong and leans towards the weakest grammar point', () => {
    const wrongKey = lineKey('d', 'd02', 1); // There are five people… (there, plural)
    let log = applyResults(emptyLog(), '2026-11-19', [
      { key: wrongKey, ok: false },
      { key: lineKey('d', 'd03', 0), ok: false }, // there, plural
      { key: lineKey('d', 'd01', 0), ok: true },
    ]);
    expect(weakTags(log).map((t) => t.id)).toEqual(expect.arrayContaining(['there', 'plural']));
    // counted once per day only
    log = applyResults(log, '2026-11-19', [{ key: wrongKey, ok: false }]);
    expect(log.items[wrongKey]).toBe(1);
    const set = pickDialogues('2026-11-21', log, { d02: '2026-11-19', d03: '2026-11-19' });
    const items = dialogueItems(set);
    expect(items).toHaveLength(20);
    expect(set.review).toContain(wrongKey);
    const all = items.flatMap((i) => i.key);
    expect(all.filter((k) => k.startsWith('d:')).length).toBe(20);
    // right on a later day → leaves the review list
    log = applyResults(log, '2026-11-21', [{ key: wrongKey, ok: true }]);
    expect(log.items[wrongKey]).toBeUndefined();
  });
  it('a new story each day until the open ones are done, then the oldest comes back', () => {
    const a = pickStory('2026-11-19', {});
    expect(STORIES.find((s) => s.id === a)!.level).toBeLessThanOrEqual(2);
    const b = pickStory('2026-11-20', { [a]: '2026-11-19' });
    expect(b).not.toBe(a);
    const open = STORIES.filter((s) => s.level <= 2);
    const done = Object.fromEntries(open.map((s, i) => [s.id, `2026-11-${String(10 + i).padStart(2, '0')}`]));
    expect(pickStory('2026-11-25', done)).toBe(open[0]!.id);
    expect(storyItems(a).length).toBeGreaterThanOrEqual(5);
  });
  it('is on the path every study day from 19/11', () => {
    const kinds = dayByDate('2026-11-20')!.tasks.map((t) => t.kind);
    expect(kinds).toEqual(expect.arrayContaining(['translate-dialogue', 'translate-story']));
    expect(dayByDate('2026-11-18')!.tasks.some((t) => t.kind === 'translate-dialogue')).toBe(false);
  });
});

describe('weak points shared with the multiple choice', () => {
  it('every multiple-choice topic maps to known grammar points', async () => {
    const { GRAMMAR_TOPICS, TOPIC_TAGS } = await import('@/lib/practice-daily');
    for (const t of GRAMMAR_TOPICS) {
      expect(TOPIC_TAGS[t.id], t.id).toBeTruthy();
      for (const tag of TOPIC_TAGS[t.id]!) expect(TAGS[tag], `${t.id}: ${tag}`).toBeTruthy();
    }
  });
  it('a multiple-choice mistake counts once a day and makes that topic come first in the review part', async () => {
    const { applyTagResult } = await import('./index');
    const { grammarSet, topicWeights, TOPIC_TAGS } = await import('@/lib/practice-daily');
    let log = applyTagResult(emptyLog(), '2027-01-20', 'mcq:g:articles:0', TOPIC_TAGS.articles!, false);
    log = applyTagResult(log, '2027-01-20', 'mcq:g:articles:0', TOPIC_TAGS.articles!, false);
    expect(log.tags.article).toBe(1);
    // a translation mistake on the same point adds up
    log = applyResults(log, '2027-01-20', [{ key: lineKey('d', 'd02', 3), ok: false }]); // article + sva
    expect(log.tags.article).toBe(2);
    const weak = topicWeights(log);
    expect(weak.articles).toBe(2);
    const set = grammarSet('2027-01-21', 2, [], weak);
    const plain = grammarSet('2027-01-21', 2, [], {});
    const count = (xs: { id: string }[]) => xs.filter((m) => m.id.startsWith('g:articles:')).length;
    expect(count(set)).toBeGreaterThan(count(plain));
    expect(count(set)).toBeGreaterThanOrEqual(3);
  });
});
