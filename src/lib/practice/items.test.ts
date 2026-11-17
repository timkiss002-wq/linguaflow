import { describe, expect, it } from 'vitest';
import { TOPICS } from '@/lib/grammar/drills';
import { DAYS, SVO_SETS } from '@/lib/roadmap/plan';
import { SVO, checkWrite, exampleItems, fixItems, fixItemsOfTopic, fixTopics, orderOk, parseChunks, shuffled, svoSet, usesWord } from './items';

const tasks = DAYS.flatMap((d) => d.tasks.map((t) => ({ d, t })));

describe('Sửa lỗi sai', () => {
  it('has 10 items for every grammar topic; each wrong sentence is marked wrong and each answer right', () => {
    expect(new Set(fixTopics())).toEqual(new Set(TOPICS.map((t) => t.id)));
    for (const id of fixTopics()) {
      const items = fixItemsOfTopic(id);
      expect(items, id).toHaveLength(10);
      for (const it of items) {
        expect(checkWrite(it, it.prompt, true).verdict, it.prompt).toBe('wrong');
        for (const a of it.en) expect(checkWrite(it, a, true).verdict, a).toBe('correct');
        expect(it.why?.length).toBeGreaterThan(5);
      }
    }
  });

  it('is on every Mon–Sat of phases 1–2 and every Sunday of phase 1, with no item twice in a day', () => {
    const fix = tasks.filter(({ t }) => t.kind === 'grammar-fix');
    const p1 = DAYS.filter((d) => d.phase === 1);
    const p2 = DAYS.filter((d) => d.phase === 2 && d.weekday !== 0 && !d.light);
    expect(fix.filter(({ d }) => d.phase === 1)).toHaveLength(p1.length);
    expect(fix.filter(({ d }) => d.phase === 2)).toHaveLength(p2.length);
    for (const { t } of fix) {
      const items = fixItems(t.fix!);
      expect(items.length, t.id).toBeGreaterThanOrEqual(6);
      expect(new Set(items.map((i) => i.key)).size, t.id).toBe(items.length);
    }
  });
});

describe('Câu chuẩn S-V-O', () => {
  it('parses every sentence into labelled chunks with a subject and a verb', () => {
    expect(SVO.sets).toHaveLength(SVO_SETS);
    for (let n = 0; n < SVO_SETS; n++)
      for (const s of svoSet(n)) {
        expect(s.chunks.some((c) => c.role === 'S') && s.chunks.some((c) => c.role === 'V'), s.text).toBe(true);
        expect(s.text).toMatch(/[.?!]$/);
        expect(s.vi.length).toBeGreaterThan(3);
      }
    expect(parseChunks('[A In big cities], [S traffic] [V is] [C a problem].').map((c) => c.role)).toEqual(['A', 'S', 'V', 'C']);
  });

  it('accepts adverbials at the start or the end, but not a changed core order', () => {
    const c = parseChunks('[S Many people] [V work] [A from home] [A nowadays].');
    const [s, v, a1, a2] = c as [typeof c[0], typeof c[0], typeof c[0], typeof c[0]];
    expect(orderOk(c, [s, v, a1, a2])).toBe(true);
    expect(orderOk(c, [a2, s, v, a1])).toBe(true);
    expect(orderOk(c, [s, v, a2, a1])).toBe(true);
    expect(orderOk(c, [s, a1, v, a2])).toBe(false);
    expect(orderOk(c, [v, s, a1, a2])).toBe(false);
  });

  it('shuffles deterministically and never returns the original order', () => {
    const xs = [0, 1, 2, 3];
    expect(shuffled(xs, 'a')).toEqual(shuffled(xs, 'a'));
    expect(shuffled(xs, 'a')).not.toEqual(xs);
  });

  it('goes through the 24 sets in order, then repeats the harder half', () => {
    const sets = tasks.filter(({ t }) => t.kind === 'grammar-svo').map(({ t }) => t.svo!);
    expect(sets.slice(0, SVO_SETS).map((s) => s.set)).toEqual([...Array(SVO_SETS).keys()]);
    sets.forEach((s, i) => i && expect(s.prev).toBe(sets[i - 1]!.set));
    expect(Math.min(...sets.slice(SVO_SETS).map((s) => s.set))).toBe(SVO_SETS / 2);
  });
});

describe('Dịch ví dụ', () => {
  it('has a Vietnamese example for every word of the first four weeks, and every answer uses its word', () => {
    const days = DAYS.filter((d) => d.date >= '2026-11-16' && d.date <= '2026-12-13' && d.weekday !== 0);
    for (const d of days) {
      const items = exampleItems(d);
      const task = d.tasks.find((t) => t.kind === 'vocab-translate');
      expect(task, d.date).toBeDefined();
      expect(items.length, d.date).toBeGreaterThanOrEqual(15);
      for (const it of items) expect(usesWord(it.en[0]!, it.mustUse!), `${it.mustUse} · ${it.en[0]}`).toBe(true);
    }
  });

  it('only schedules the task when the day has examples in Vietnamese', () => {
    for (const { d, t } of tasks.filter((x) => x.t.kind === 'vocab-translate')) expect(exampleItems(d).length, t.id).toBeGreaterThan(0);
  });
});
