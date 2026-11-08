import { beforeEach, describe, expect, it } from 'vitest';
import {
  CAM_INDEX,
  OWN_SETS,
  __resetForTests,
  findRange,
  grade,
  itemMeta,
  nextSet,
  notebook,
  parseImport,
  parseStmt,
  saveImport,
  saveItem,
  streak,
  toImportInput,
  tokenize,
  type ItemState,
} from './passage3';

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

describe('content', () => {
  it('every keyword of every ready-made set has a pair, and every pair is found in its passage', () => {
    expect(OWN_SETS.length).toBeGreaterThanOrEqual(66);
    expect(OWN_SETS.every((s) => s.art), 'every set has an illustration').toBe(true);
    for (const set of OWN_SETS) {
      expect(set.items.length, set.id).toBeGreaterThanOrEqual(4);
      set.items.forEach((item, i) => {
        const ids = parseStmt(item.stmt).flatMap((p) => (p.t === 'txt' ? [] : [p.id]));
        expect(ids.length, `${set.id} #${i}`).toBeGreaterThan(0);
        for (const id of ids) {
          const pr = item.pairs[id]!;
          expect(pr, `${set.id} #${i} ${id}`).toBeDefined();
          if (pr.p) expect(findRange(set.passage, pr.p, pr.n), `${set.id} #${i} "${pr.p}"`).not.toBeNull();
        }
        expect(Object.keys(item.pairs).every((k) => ids.includes(k)), `${set.id} #${i} unused pair`).toBe(true);
        if (set.type === 'gap') {
          expect(ids).toContain('g');
          expect(typeof item.ans === 'number' && set.box && item.ans < set.box.length, `${set.id} #${i} box answer`).toBe(true);
        }
        if (set.type === 'mcq') expect(item.options?.[item.ans as number], `${set.id} #${i}`).toBeDefined();
        if (set.type === 'tfng') expect(['T', 'F', 'NG']).toContain(item.ans);
        if (set.type === 'ynng') expect(['Y', 'N', 'NG']).toContain(item.ans);
      });
    }
    expect(new Set(OWN_SETS.map((s) => s.id)).size).toBe(OWN_SETS.length);
  });

  it('indexes the 44 Passage 3s of Cambridge 10–20 without storing any text', () => {
    expect(CAM_INDEX).toHaveLength(44);
    expect(CAM_INDEX.filter((c) => c.book === 12).map((c) => c.test)).toEqual([5, 6, 7, 8]);
    expect(Object.keys(CAM_INDEX[0]!).sort()).toEqual(['book', 'id', 'test', 'title']);
  });
});

describe('grading', () => {
  const set = OWN_SETS.find((s) => s.id === 'A1')!;
  const toks = tokenize(set.passage);
  const at = (word: string) => toks.findIndex((t) => t.w.startsWith(word));

  it('a pair is right when a chosen word lies in the key phrase, and "not in the passage" is right only for null keys', () => {
    const st: ItemState = { sel: { no: [at('observed')], tg: [at('turned')], ds: [at('ceases')] }, none: { fi: true }, ans: 'NG', checked: false };
    const res = grade(set, 0, st);
    expect(res.ansOk).toBe(true);
    expect(res.pairs.every((p) => p.ok)).toBe(true);
    const wrong = grade(set, 0, { ...st, sel: { ...st.sel, no: [at('Hospitals')] }, none: {} });
    expect(wrong.pairs.find((p) => p.id === 'no')!.ok).toBe(false);
    expect(wrong.pairs.find((p) => p.id === 'fi')!.ok).toBe(false);
  });

  it('obvious pairs are not pills', () => {
    const m = itemMeta(set, 0);
    expect(m.pills).toEqual(['fi', 'no', 'tg', 'ds']);
    expect(m.order[0]).toBe('gd');
  });

  it('finishing a set records the day, the streak and the notebook', () => {
    const b1 = OWN_SETS.find((s) => s.id === 'B1')!;
    b1.items.forEach((item, i) => saveItem(b1, i, { sel: {}, none: {}, ans: item.ans, checked: true, res: { pairs: [{ id: 'g', ok: i === 0 }], ansOk: true } }));
    expect(streak([new Date().toLocaleDateString('en-CA')])).toBe(1);
    const rows = notebook();
    expect(rows.length).toBeGreaterThan(5);
    expect(rows[0]!.missed).toBe(true);
    expect(nextSet('B')!.id).not.toBe('B1');
  });
});

describe('streak', () => {
  it('counts back from today, or from yesterday if today is not done yet', () => {
    const now = new Date(2026, 10, 7, 12);
    expect(streak(['2026-11-05', '2026-11-06', '2026-11-07'], now)).toBe(3);
    expect(streak(['2026-11-05', '2026-11-06'], now)).toBe(2);
    expect(streak(['2026-11-04'], now)).toBe(0);
  });
});

describe('importing from the learner’s book', () => {
  const passage = 'Without knowing much, our advocates follow in his tracks in rejecting as outmoded pretty much all ethical reflection on happiness.';

  it('turns [brackets] into keywords and reads the answer after ||', () => {
    const { set, errors } = parseImport({ camId: 'cam13-t4', title: '', type: 'tfng', passage, questions: 'The reviewer [accepts] that [earlier thinking] is [out of date]. || false', box: '' });
    expect(errors).toEqual([]);
    expect(set!.title).toBe(CAM_INDEX.find((c) => c.id === 'cam13-t4')!.title);
    expect(set!.items[0]!.ans).toBe('F');
    expect(itemMeta(set!, 0).pills).toEqual(['k1', 'k2', 'k3']);
    expect(set!.keyless).toBe(true);
    expect(grade(set!, 0, { sel: {}, none: {}, ans: 'F', checked: false }).pairs[0]!.ok).toBeNull();
  });

  it('reports bad answers and handles MCQ, word boxes and typed gaps', () => {
    expect(parseImport({ title: 'x', type: 'tfng', passage, questions: 'A [b] c || maybe', box: '' }).errors[0]).toMatch(/không hợp lệ/);
    const mcq = parseImport({ title: 'x', type: 'mcq', passage, questions: 'Why [x]? || one || two || three || C', box: '' }).set!;
    expect(mcq.items[0]!).toMatchObject({ ans: 2, options: ['one', 'two', 'three'] });
    const boxed = parseImport({ title: 'x', type: 'gap', passage, questions: 'They [reject] ____ thinking || B', box: 'A new\nB earlier\nC modern' }).set!;
    expect(boxed.items[0]!.ans).toBe(1);
    expect(boxed.items[0]!.stmt).toContain('[g:____]');
    const typed = parseImport({ title: 'x', type: 'gap', passage, questions: 'Thinking is ____ || outmoded / out of date', box: '' }).set!;
    expect(grade(typed, 0, { sel: {}, none: {}, ans: ' Out of date ', checked: false }).ansOk).toBe(true);
  });

  it('round-trips through the edit form and is saved on the device', () => {
    const input = { camId: 'cam19-t4', title: 'The Unselfish Gene', type: 'ynng' as const, passage, questions: 'The writer [agrees] with it || YES\nIt is [new] || NOT GIVEN', box: '' };
    const { set } = parseImport(input);
    saveImport(set!);
    __resetForTests();
    const again = toImportInput(set!);
    expect(again.questions).toBe('The writer [agrees] with it || YES\nIt is [new] || NOT GIVEN');
    expect(nextSet('cam')!.id).toBe('my-cam19-t4');
  });
});
