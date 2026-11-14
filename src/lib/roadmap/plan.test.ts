import { describe, expect, it } from 'vitest';
import { TOPICS } from '@/lib/grammar/drills';
import { GUIDED_PROMPTS, GUIDED_TYPES } from '@/lib/writing/guided';
import { SKILLS } from '@/lib/ielts/skills';
import writingTasks from '../../../content/writing-tasks.json';
import { ALL_WORDS, DAYS, GRAMMAR_SEQUENCE, NEW_WORDS, START, TARGET, WEEKS, addDays, daysBetween, wordsOf } from './plan';

describe('learning path', () => {
  it('covers every day from 14/11/2026 to 15/04/2027, in order', () => {
    expect(DAYS[0]!.date).toBe(START);
    expect(DAYS[DAYS.length - 1]!.date).toBe(TARGET);
    expect(DAYS).toHaveLength(daysBetween(START, TARGET) + 1);
    DAYS.forEach((d, i) => i && expect(d.date).toBe(addDays(DAYS[i - 1]!.date, 1)));
    expect(new Set(DAYS.flatMap((d) => d.tasks.map((t) => t.id))).size).toBe(DAYS.reduce((n, d) => n + d.tasks.length, 0));
  });

  it('starts each week on a Monday (after the two warm-up days)', () => {
    for (const w of WEEKS.slice(1)) expect(new Date(`${w.start}T00:00:00`).getDay(), w.start).toBe(1);
  });

  it('teaches every grammar topic of phase 1 exactly once, each one existing with a quiz', () => {
    expect(GRAMMAR_SEQUENCE).toHaveLength(16);
    expect(new Set(GRAMMAR_SEQUENCE).size).toBe(16);
    for (const id of GRAMMAR_SEQUENCE) {
      const t = TOPICS.find((x) => x.id === id);
      expect(t, id).toBeDefined();
      expect(t!.quiz?.length, id).toBe(6);
      const learn = DAYS.flatMap((d) => d.tasks).filter((x) => x.kind === 'grammar-learn' && x.topic === id);
      expect(learn, id).toHaveLength(1);
    }
  });

  it('schedules every word still to learn once, in the order of the sheet, and stops new words before the mock tests', () => {
    const ranges = DAYS.flatMap((d) => d.tasks).filter((t) => t.kind === 'vocab-new').map((t) => t.words!);
    expect(ranges[0]![0]).toBe(0);
    ranges.forEach((r, i) => i && expect(r[0]).toBe(ranges[i - 1]![1]));
    expect(ranges[ranges.length - 1]![1]).toBe(NEW_WORDS.length);
    const lastNew = DAYS.filter((d) => d.tasks.some((t) => t.kind === 'vocab-new')).pop()!;
    expect(lastNew.date < '2027-03-08').toBe(true);
    expect(NEW_WORDS.length).toBeGreaterThan(1000);
    expect(ALL_WORDS.every((w) => w.t && w.topic)).toBe(true);
    const first = DAYS.flatMap((d) => d.tasks).find((t) => t.kind === 'vocab-new')!;
    expect(wordsOf(first)).toHaveLength(15);
  });

  it('keeps Tết light: no new words and no grammar from 04/02 to 14/02/2027', () => {
    for (const d of DAYS.filter((x) => x.date >= '2027-02-04' && x.date <= '2027-02-14')) {
      expect(d.light, d.date).toBe(true);
      expect(d.tasks.map((t) => t.kind).sort()).toEqual(['reading-p3', 'vocab-review']);
    }
  });

  it('links only to pages and content that exist', () => {
    const guided = new Set(GUIDED_PROMPTS.map((p) => p.id));
    const frames = new Set(GUIDED_TYPES.map((t) => t.id));
    const skills = new Set(SKILLS.map((s) => s.id));
    const tasks = new Set((writingTasks as { tasks: { id: string }[] }).tasks.map((t) => t.id));
    for (const t of DAYS.flatMap((d) => d.tasks)) {
      if (!t.href) continue;
      const [path, query = ''] = t.href.split('?');
      const m = path!.match(/^\/writing\/guided\/frame\/(.+)$/);
      if (m) expect(frames.has(m[1]!), t.href).toBe(true);
      else if (path!.startsWith('/writing/guided/')) expect(guided.has(path!.slice('/writing/guided/'.length)), t.href).toBe(true);
      if (path!.startsWith('/writing/new/')) expect(tasks.has(path!.slice('/writing/new/'.length)), t.href).toBe(true);
      const skill = new URLSearchParams(query).get('skill');
      if (skill) expect(skills.has(skill), t.href).toBe(true);
      if (path!.startsWith('/grammar/')) expect(TOPICS.some((x) => x.id === path!.slice(9)), t.href).toBe(true);
    }
  });

  it('retests at the end of phases 1 and 2, and ends on the target day', () => {
    const retests = DAYS.filter((d) => d.tasks.some((t) => t.kind === 'retest')).map((d) => d.date);
    expect(retests).toEqual(['2027-01-10', '2027-03-07']);
    expect(DAYS[DAYS.length - 1]!.tasks[0]!.title).toContain('Ngày mục tiêu');
  });
});
