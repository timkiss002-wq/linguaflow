import { describe, expect, it } from 'vitest';
import { usesWord } from '@/lib/practice/items';
import { ACTIVE_TOPICS, DAYS, WEEKS } from './plan';
import { WRITING_WEEKS, gapItems, paragraphItems, usedTargets, weekCollocations, writingWeek } from './writing';

/** What has been learned by the end of week n: collocations of the topics of weeks ≤ n, word forms and extra words of writing weeks ≤ n. */
function learnedBy(n: number) {
  const terms: string[] = [];
  for (const t of ACTIVE_TOPICS.filter((x) => x.week && x.week <= n)) {
    const ww = writingWeek(t.week!);
    terms.push(...(ww ? weekCollocations(ww) : t.words).map((w) => w.t));
  }
  for (const w of WRITING_WEEKS.filter((x) => x.week <= n)) {
    terms.push(...w.forms.flatMap((f) => f.words.map((x) => x.w)));
    terms.push(...w.bank.map((b) => b.term.replace(/\s*\([^)]*\)$/, '')));
  }
  return terms.map((t) => t.toLowerCase());
}

describe('Writing tuần', () => {
  it('has one writing week per week of the path with active collocations, on the same topic', () => {
    for (const topic of ACTIVE_TOPICS.filter((t) => t.week)) expect(writingWeek(topic.week!)?.topic, `tuần ${topic.week}`).toBe(topic.id);
    expect(ACTIVE_TOPICS.find((t) => t.id === 'life')?.week).toBe(14);
    expect(ACTIVE_TOPICS.find((t) => t.id === 'work')?.name).toBe('Work & Career');
  });

  it('builds every sentence of the model paragraph only from what was learned by then, and the model answer uses it', () => {
    for (const w of WRITING_WEEKS) {
      const learned = learnedBy(w.week);
      for (const s of w.paragraph) {
        expect(usesWord(s.en[0]!, s.use), `tuần ${w.week}: ${s.en[0]}`).toBe(true);
        expect(learned.some((l) => l === s.use.toLowerCase() || l.includes(s.use.toLowerCase())), `tuần ${w.week}: "${s.use}" chưa học`).toBe(true);
      }
      // the paragraph really practises the week's collocations
      const used = weekCollocations(w).filter((c) => w.paragraph.some((s) => usesWord(s.en[0]!, c.t)));
      expect(used.length, `tuần ${w.week}`).toBeGreaterThanOrEqual(8);
    }
  });

  it('has 8 word families with 2 gaps each, and every answer is one of the family words', () => {
    for (const w of WRITING_WEEKS) {
      expect(w.forms).toHaveLength(8);
      for (const f of w.forms) {
        expect(f.gaps).toHaveLength(2);
        const forms = f.words.map((x) => x.w.toLowerCase());
        for (const g of f.gaps) for (const a of g.a) expect(forms.some((x) => a.toLowerCase().startsWith(x) || x.startsWith(a.toLowerCase().replace(/ies$/, 'y').replace(/s$/, ''))), `${f.head}: ${a}`).toBe(true);
      }
      expect(gapItems(w)).toHaveLength(16);
      expect(paragraphItems(w).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('puts word forms before the paragraph in every writing week, on days with vocabulary', () => {
    for (const w of WRITING_WEEKS) {
      const days = DAYS.filter((d) => d.week === w.week);
      const wf = days.find((d) => d.tasks.some((t) => t.kind === 'wordform-week'));
      const wr = days.find((d) => d.tasks.some((t) => t.kind === 'writing-week'));
      expect(wf, `tuần ${w.week}`).toBeDefined();
      expect(wr, `tuần ${w.week}`).toBeDefined();
      expect(wf!.date <= wr!.date).toBe(true);
      const week = WEEKS.find((x) => x.n === w.week)!;
      // phase 1: Saturday + Sunday; phase 2: Thursday + Saturday (Wednesday in the short Tết week)
      if (week.phase === 1) expect([wf!.weekday, wr!.weekday]).toEqual([6, 0]);
      else if (week.light?.length) expect([wf!.weekday, wr!.weekday]).toEqual([3, 3]);
      else expect([wf!.weekday, wr!.weekday]).toEqual([4, 6]);
    }
  });

  it('no task of the path points to an AI page any more', () => {
    for (const d of DAYS)
      for (const t of d.tasks) {
        expect(t.href ?? '', t.id).not.toContain('/writing/mistakes');
        expect(t.detail, t.id).not.toMatch(/\bAI\b/);
      }
  });

  it('recognises the week words in an own paragraph', () => {
    const w = writingWeek(1)!;
    const used = usedTargets('Schools should equip students with practical skills. Employers value knowledge and success.', w).map((t) => t.term);
    expect(used).toEqual(expect.arrayContaining(['equip students with', 'practical skills', 'knowledge', 'success']));
  });
});
