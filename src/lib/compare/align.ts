/** Minimal edit-distance alignment between two token sequences, with traceback. */
export type AlignOp<A, B> =
  | { op: 'match'; a: A; b: B }
  | { op: 'sub'; a: A; b: B }
  | { op: 'del'; a: A } // in expected, missing from the answer
  | { op: 'ins'; b: B }; // in the answer, not expected

export function align<A, B>(
  as: readonly A[],
  bs: readonly B[],
  equal: (a: A, b: B) => boolean,
  subCost: (a: A, b: B) => number = () => 1,
  delCost: (a: A) => number = () => 1,
  insCost: (b: B) => number = () => 1,
): AlignOp<A, B>[] {
  const n = as.length;
  const m = bs.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) d[i]![0] = d[i - 1]![0]! + delCost(as[i - 1]!);
  for (let j = 1; j <= m; j++) d[0]![j] = d[0]![j - 1]! + insCost(bs[j - 1]!);

  const step = (i: number, j: number) => (equal(as[i - 1]!, bs[j - 1]!) ? 0 : subCost(as[i - 1]!, bs[j - 1]!));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i]![j] = Math.min(d[i - 1]![j - 1]! + step(i, j), d[i - 1]![j]! + delCost(as[i - 1]!), d[i]![j - 1]! + insCost(bs[j - 1]!));
    }
  }

  const ops: AlignOp<A, B>[] = [];
  let i = n;
  let j = m;
  const EPS = 1e-9;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(d[i]![j]! - (d[i - 1]![j - 1]! + step(i, j))) < EPS) {
      const a = as[i - 1]!;
      const b = bs[j - 1]!;
      ops.push(equal(a, b) ? { op: 'match', a, b } : { op: 'sub', a, b });
      i--;
      j--;
    } else if (i > 0 && Math.abs(d[i]![j]! - (d[i - 1]![j]! + delCost(as[i - 1]!))) < EPS) {
      ops.push({ op: 'del', a: as[i - 1]! });
      i--;
    } else {
      ops.push({ op: 'ins', b: bs[j - 1]! });
      j--;
    }
  }
  return ops.reverse();
}

/** Classic character Levenshtein distance. */
export function levenshtein(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, k) => k);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length]!;
}

/** 1 = identical, 0 = nothing in common. */
export function similarity(a: string, b: string): number {
  const len = Math.max([...a].length, [...b].length);
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len;
}

/** Optimal-string-alignment distance: like Levenshtein, but a swap of two neighbours costs 1. */
export function osaDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  const d = Array.from({ length: x.length + 1 }, (_, i) => Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  }
  return d[x.length]![y.length]!;
}

/** Similarity used to decide "spelling slip" vs "different word". */
export function spellingSimilarity(a: string, b: string): number {
  const len = Math.max([...a].length, [...b].length);
  return len === 0 ? 1 : 1 - osaDistance(a, b) / len;
}
