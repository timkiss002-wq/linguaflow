import { describe, expect, it } from "vitest";
import {
  emptyRun,
  firstRoundDone,
  firstScore,
  record,
  runPassed,
  toRedo,
  type RunItem,
} from "./retry";

const active = Array.from({ length: 5 }, (_, i) => ({ key: `a${i}` }));
const passive: RunItem[] = [
  { key: "p0", graded: false },
  { key: "p1", graded: false },
];
const items = [...active, ...passive];

/** first round: `wrong` keys fail on the first try; passive ones in `wrong` also end wrong */
function firstRound(wrong: string[]) {
  let st = emptyRun();
  for (const i of items)
    st = record(st, i, true, !wrong.includes(i.key), !wrong.includes(i.key));
  return st;
}

describe("shared pass rule", () => {
  it("passes at ≥ 50 % first try of the active sentences, without redoing anything", () => {
    const st = firstRound(["a0"]);
    expect(firstScore(items, st)).toEqual({ score: 4, total: 5 });
    expect(toRedo(items, st)).toEqual([]);
    expect(runPassed(items, st)).toBe(true);
  });

  it("below 50 % only the active sentences wrong the first time come back", () => {
    const st = firstRound(["a0", "a2", "a3"]);
    expect(toRedo(items, st)).toEqual(["a0", "a2", "a3"]);
    let r = record(st, active[0]!, false, true, true);
    r = record(r, active[2]!, false, true, true);
    expect(toRedo(items, r)).toEqual(["a3"]);
    // right only on the second try of the redo: still to redo
    r = record(r, active[3]!, false, false, true);
    expect(toRedo(items, r)).toEqual(["a3"]);
    r = record(r, active[3]!, false, true, true);
    expect(runPassed(items, r)).toBe(true);
    // the first-try score itself never changes
    expect(firstScore(items, r).score).toBe(2);
  });

  it("passive sentences only have to be right in the end, however many tries", () => {
    // right on a later try in the first round: fine
    let st = emptyRun();
    for (const i of active) st = record(st, i, true, true, true);
    st = record(st, passive[0]!, true, false, false);
    st = record(st, passive[0]!, true, false, true);
    st = record(st, passive[1]!, true, false, false);
    expect(firstRoundDone(items, st)).toBe(true);
    expect(toRedo(items, st)).toEqual(["p1"]);
    // in a redo, any try counts
    st = record(st, passive[1]!, false, false, true);
    expect(runPassed(items, st)).toBe(true);
  });

  it("a wrong passive sentence comes back even when the active part passed", () => {
    const st = firstRound(["p1"]);
    expect(toRedo(items, st)).toEqual(["p1"]);
    expect(runPassed(items, st)).toBe(false);
  });
});
