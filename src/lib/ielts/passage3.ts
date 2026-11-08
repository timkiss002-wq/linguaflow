import daily from '../../../content/p3-daily.json';
import camIndex from '../../../content/cambridge-p3.json';
import { markDailyDone } from '@/lib/daily';

/**
 * Reading part of "Bài tập hằng ngày": 4–5 questions a day on a short Passage-3-level text, answered the way a teacher marks a text by
 * hand — first pair every keyword of the question with its paraphrase in the passage (colour by colour), only then
 * choose the answer. A keyword with no partner in the passage is the classic sign of NOT GIVEN.
 *
 * Two sources of sets:
 * - written for LinguaFlow (content/p3-daily.json), with a key for every pair and a Vietnamese explanation;
 * - the learner's own copy of Cambridge IELTS 10–20 Passage 3 (content/cambridge-p3.json is only an index), pasted in
 *   and kept on this device. Those have the answer key the learner types in, but no key for the pairs.
 */

export type P3Type = 'tfng' | 'ynng' | 'mcq' | 'gap';
export type Track = 'A' | 'B';

export interface P3Pair {
  /** phrase in the passage; null = not in the passage (→ NOT GIVEN) */
  p: string | null;
  /** which occurrence of p, when it appears more than once */
  n?: number;
  /** Vietnamese gloss */
  vi?: string;
}

export interface P3Item {
  /** {id:text} = obvious pair, shown highlighted; [id:text] = keyword the learner pairs; [g:____] = the gap */
  stmt: string;
  pairs: Record<string, P3Pair>;
  /** tfng/ynng: T F NG / Y N NG · mcq: option index · gap: box index, or the words when there is no box */
  ans: string | number;
  options?: string[];
  /** gap without a box: accepted answers */
  accept?: string[];
  para?: [string, string][];
  explain?: string;
}

export interface P3Set {
  id: string;
  track: Track;
  type: P3Type;
  title: string;
  topic: string;
  passage: string;
  box?: string[];
  items: P3Item[];
  /** illustration on the card (CoverArt motif) */
  art?: string;
  /** pasted by the learner: no key for the pairs */
  keyless?: boolean;
  camId?: string;
}

export interface CamEntry {
  id: string;
  book: number;
  test: number;
  title: string | null;
}

export const OWN_SETS = daily.sets as unknown as P3Set[];
export const CAM_INDEX = camIndex.passages as CamEntry[];
export const CAM_BOOKS = [...new Set(CAM_INDEX.map((c) => c.book))];

export const TYPE_INFO: Record<P3Type, { label: string; short: string }> = {
  tfng: { label: 'TRUE / FALSE / NOT GIVEN', short: 'T/F/NG' },
  ynng: { label: 'YES / NO / NOT GIVEN', short: 'Y/N/NG' },
  mcq: { label: 'Multiple choice', short: 'MCQ' },
  gap: { label: 'Summary completion', short: 'Gap' },
};

export const JUDGE: Record<'tfng' | 'ynng', [string, string][]> = {
  tfng: [
    ['T', 'TRUE'],
    ['F', 'FALSE'],
    ['NG', 'NOT GIVEN'],
  ],
  ynng: [
    ['Y', 'YES'],
    ['N', 'NO'],
    ['NG', 'NOT GIVEN'],
  ],
};

/** One colour per pair, light enough for black text in both themes. */
export const PAIR_COLORS = ['#FFD43B', '#F99BB5', '#74C7F2', '#7BCF8B', '#C2A9E8', '#FFB067', '#6EDAD0'];
export const LETTERS = 'ABCDEFGHIJKL';

// ---------- statement & passage ----------

export type StmtPart = { t: 'txt'; v: string } | { t: 'ob' | 'pill'; id: string; v: string };

export function parseStmt(stmt: string): StmtPart[] {
  const re = /\{(\w+):([^}]+)\}|\[(\w+):([^\]]+)\]/g;
  const out: StmtPart[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stmt))) {
    if (m.index > last) out.push({ t: 'txt', v: stmt.slice(last, m.index) });
    if (m[1]) out.push({ t: 'ob', id: m[1], v: m[2] ?? '' });
    else out.push({ t: 'pill', id: m[3] ?? '', v: m[4] ?? '' });
    last = re.lastIndex;
  }
  if (last < stmt.length) out.push({ t: 'txt', v: stmt.slice(last) });
  return out;
}

export interface Token {
  s: number;
  e: number;
  w: string;
  /** a blank line comes before this token (new paragraph) */
  para: boolean;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let prevEnd = 0;
  while ((m = re.exec(text))) {
    const gap = text.slice(prevEnd, m.index);
    out.push({ s: m.index, e: m.index + m[0].length, w: m[0], para: out.length > 0 && /\n/.test(gap) });
    prevEnd = m.index + m[0].length;
  }
  return out;
}

export function findRange(text: string, p: string | null, n = 1): [number, number] | null {
  if (!p) return null;
  const find = (hay: string, needle: string) => {
    let from = 0;
    let idx = -1;
    for (let k = 0; k < n; k++) {
      idx = hay.indexOf(needle, from);
      if (idx < 0) return -1;
      from = idx + 1;
    }
    return idx;
  };
  let idx = find(text, p);
  if (idx < 0) idx = find(text.toLowerCase(), p.toLowerCase());
  return idx < 0 ? null : [idx, idx + p.length];
}

export const overlaps = (t: Token, r: [number, number] | null | undefined) => !!r && t.s < r[1] && t.e > r[0];

export interface ItemMeta {
  item: P3Item;
  parts: StmtPart[];
  /** every pair id, in reading order */
  order: string[];
  color: Record<string, string>;
  /** the ids the learner must pair */
  pills: string[];
  ranges: Record<string, [number, number] | null>;
}

export function itemMeta(set: P3Set, i: number): ItemMeta {
  const item = set.items[i]!;
  const parts = parseStmt(item.stmt);
  const order: string[] = [];
  for (const p of parts) if (p.t !== 'txt' && !order.includes(p.id)) order.push(p.id);
  const color: Record<string, string> = {};
  order.forEach((id, k) => (color[id] = PAIR_COLORS[k % PAIR_COLORS.length] ?? '#FFD43B'));
  const pills = order.filter((id) => parts.some((p) => p.t === 'pill' && p.id === id));
  const ranges: Record<string, [number, number] | null> = {};
  for (const id of order) {
    const pr = item.pairs[id];
    ranges[id] = pr ? findRange(set.passage, pr.p, pr.n) : null;
  }
  return { item, parts, order, color, pills, ranges };
}

// ---------- answering ----------

export interface ItemState {
  /** pill id → token indexes chosen in the passage */
  sel: Record<string, number[]>;
  /** pill ids marked "not in the passage" */
  none: Record<string, boolean>;
  ans: string | number | null;
  checked: boolean;
  /** ok: true/false, or null when the set has no key for pairs */
  res?: { pairs: { id: string; ok: boolean | null }[]; ansOk: boolean };
}

export const emptyState = (): ItemState => ({ sel: {}, none: {}, ans: null, checked: false });
export const settled = (st: ItemState, id: string) => !!(st.none[id] || st.sel[id]?.length);

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function answerIsRight(set: P3Set, item: P3Item, ans: string | number | null): boolean {
  if (ans === null || ans === '') return false;
  if (set.type === 'gap' && !set.box?.length) {
    const typed = normalize(String(ans));
    return (item.accept ?? [String(item.ans)]).some((a) => normalize(a) === typed);
  }
  return ans === item.ans;
}

export function grade(set: P3Set, i: number, st: ItemState): NonNullable<ItemState['res']> {
  const meta = itemMeta(set, i);
  const toks = tokenize(set.passage);
  const pairs = meta.pills.map((id) => {
    if (set.keyless) return { id, ok: null };
    const r = meta.ranges[id];
    const ok = !r ? !!st.none[id] : !st.none[id] && (st.sel[id] ?? []).some((k) => !!toks[k] && overlaps(toks[k], r));
    return { id, ok };
  });
  return { pairs, ansOk: answerIsRight(set, meta.item, st.ans) };
}

export function answerLabel(set: P3Set, item: P3Item, ans: string | number | null): string {
  if (ans === null || ans === '') return '—';
  if (set.type === 'tfng' || set.type === 'ynng') return JUDGE[set.type].find(([k]) => k === ans)?.[1] ?? String(ans);
  if (set.type === 'mcq') return `${LETTERS[Number(ans)]}. ${item.options?.[Number(ans)] ?? ''}`;
  if (set.box?.length) return `${LETTERS[Number(ans)]}. ${set.box[Number(ans)] ?? ''}`;
  return String(ans);
}

// ---------- storage (this device) ----------

const KEY = 'lf.p3daily.v1';
const IMPORTS = 'lf.p3daily.imports.v1';

export interface P3Progress {
  items: Record<string, Record<number, ItemState>>;
  done: Record<string, { score: number; total: number; pairs: string; at: string }>;
  /** YYYY-MM-DD of each day a set was finished */
  days: string[];
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode or full */
  }
};

let progress: P3Progress | null = null;
let imports: P3Set[] | null = null;
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getVersion = () => version;

export function getProgress(): P3Progress {
  if (!progress) progress = { items: {}, done: {}, days: [], ...read<Partial<P3Progress>>(KEY, {}) } as P3Progress;
  return progress;
}
export function getImports(): P3Set[] {
  if (!imports) imports = read<P3Set[]>(IMPORTS, []);
  return imports;
}

export const allSets = () => [...OWN_SETS, ...getImports()];
export const setById = (id: string) => allSets().find((s) => s.id === id);
export const importFor = (camId: string) => getImports().find((s) => s.camId === camId);

export const today = (d = new Date()) => d.toLocaleDateString('en-CA');

export function itemState(setId: string, i: number): ItemState {
  return getProgress().items[setId]?.[i] ?? emptyState();
}

export function saveItem(set: P3Set, i: number, st: ItemState) {
  const p = getProgress();
  p.items[set.id] = { ...(p.items[set.id] ?? {}), [i]: st };
  const sum = setSummary(set);
  if (sum.checked === set.items.length && !p.done[set.id]) {
    p.done[set.id] = { score: sum.right, total: set.items.length, pairs: `${sum.pairsOk}/${sum.pairsTotal}`, at: today() };
    if (!p.days.includes(today())) p.days.push(today());
    markDailyDone('reading');
  }
  write(KEY, p);
  emit();
}

export function resetSet(setId: string) {
  const p = getProgress();
  delete p.items[setId];
  delete p.done[setId];
  write(KEY, p);
  emit();
}

export function setSummary(set: P3Set) {
  const states = getProgress().items[set.id] ?? {};
  let checked = 0;
  let right = 0;
  let pairsOk = 0;
  let pairsTotal = 0;
  set.items.forEach((_, i) => {
    const s = states[i];
    if (!s?.checked || !s.res) return;
    checked++;
    if (s.res.ansOk) right++;
    for (const x of s.res.pairs)
      if (x.ok !== null) {
        pairsTotal++;
        if (x.ok) pairsOk++;
      }
  });
  return { checked, right, pairsOk, pairsTotal };
}

/** The set to do today on a track: one in progress, else the first not done, else the weakest done one. */
export function nextSet(track: Track | 'cam'): P3Set | undefined {
  const list = track === 'cam' ? getImports() : OWN_SETS.filter((s) => s.track === track);
  const p = getProgress();
  const inProgress = list.find((s) => !p.done[s.id] && setSummary(s).checked > 0);
  if (inProgress) return inProgress;
  const fresh = list.find((s) => !p.done[s.id]);
  if (fresh) return fresh;
  const ratio = (s: P3Set) => (p.done[s.id] ? p.done[s.id]!.score / p.done[s.id]!.total : 0);
  return [...list].sort((a, b) => ratio(a) - ratio(b))[0];
}

export function streak(days: string[], now = new Date()): number {
  const set = new Set(days);
  const d = new Date(now);
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface NoteRow {
  question: string;
  passage: string;
  vi: string;
  setId: string;
  missed: boolean;
}

/** Paraphrase notebook: every pair of a finished set (the learner's own pairs for pasted sets), missed ones first. */
export function notebook(): NoteRow[] {
  const p = getProgress();
  const rows: NoteRow[] = [];
  for (const set of allSets()) {
    if (!p.done[set.id]) continue;
    const toks = tokenize(set.passage);
    set.items.forEach((item, i) => {
      const st = p.items[set.id]?.[i];
      for (const part of parseStmt(item.stmt)) {
        if (part.t !== 'pill') continue;
        const q = part.id === 'g' ? (set.box && typeof item.ans === 'number' ? (set.box[item.ans] ?? '') : String(item.ans)) : part.v;
        if (set.keyless) {
          const picked = (st?.sel[part.id] ?? []).map((k) => toks[k]?.w).join(' ');
          if (picked) rows.push({ question: q, passage: picked, vi: '', setId: set.id, missed: false });
          continue;
        }
        const pr = item.pairs[part.id];
        if (!pr?.p) continue;
        const missed = !!st?.res && st.res.pairs.find((x) => x.id === part.id)?.ok === false;
        rows.push({ question: q, passage: pr.p, vi: pr.vi ?? '', setId: set.id, missed });
      }
    });
  }
  return rows.sort((a, b) => Number(b.missed) - Number(a.missed));
}

// ---------- importing a passage from the learner's own book ----------

export interface ImportInput {
  camId?: string;
  title: string;
  type: P3Type;
  passage: string;
  questions: string;
  box: string;
}

const JUDGE_WORDS: Record<string, string> = { TRUE: 'T', T: 'T', FALSE: 'F', F: 'F', YES: 'Y', Y: 'Y', NO: 'N', N: 'N', 'NOT GIVEN': 'NG', NG: 'NG' };

/**
 * One question per line, answer after "||":
 *   tfng / ynng:  The reviewer [accepts] that [earlier thinking] is [out of date] || FALSE
 *   mcq:          What does the writer [suggest] about X? || option A || option B || option C || option D || B
 *   gap:          Engineers should [extract] the ____ and adapt it || principle      (or a letter when there is a word box)
 * Keywords to pair go in [square brackets]; "____" is the gap.
 */
export function parseImport(input: ImportInput): { set: P3Set | null; errors: string[] } {
  const errors: string[] = [];
  const box = input.box
    .split('\n')
    .map((l) => l.replace(/^[A-L][.)]\s*/, '').trim())
    .filter(Boolean);
  if (!input.passage.trim()) errors.push('Chưa dán đoạn văn.');
  const lines = input.questions
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) errors.push('Chưa có câu hỏi nào.');
  const items: P3Item[] = [];
  lines.forEach((line, li) => {
    const n = li + 1;
    const cells = line.split('||').map((c) => c.trim());
    if (cells.length < 2 || !cells[cells.length - 1]) {
      errors.push(`Câu ${n}: thiếu đáp án sau "||".`);
      return;
    }
    let k = 0;
    const pairs: Record<string, P3Pair> = {};
    let text = (cells[0] ?? '').replace(/_{3,}/, () => {
      pairs.g = { p: null };
      return '[g:____]';
    });
    text = text.replace(/\[([^\]:]+)\]/g, (_m, w: string) => {
      const id = `k${++k}`;
      pairs[id] = { p: null };
      return `[${id}:${w.trim()}]`;
    });
    const rawAns = cells[cells.length - 1] ?? '';
    let ans: string | number;
    let options: string[] | undefined;
    let accept: string[] | undefined;
    if (input.type === 'tfng' || input.type === 'ynng') {
      const a = JUDGE_WORDS[rawAns.toUpperCase()];
      const ok = input.type === 'tfng' ? ['T', 'F', 'NG'] : ['Y', 'N', 'NG'];
      if (!a || !ok.includes(a)) {
        errors.push(`Câu ${n}: đáp án "${rawAns}" không hợp lệ (dùng ${input.type === 'tfng' ? 'TRUE / FALSE / NOT GIVEN' : 'YES / NO / NOT GIVEN'}).`);
        return;
      }
      ans = a;
    } else if (input.type === 'mcq') {
      options = cells.slice(1, -1);
      const idx = LETTERS.indexOf(rawAns.toUpperCase());
      if (options.length < 2) {
        errors.push(`Câu ${n}: cần ít nhất 2 phương án, cách nhau bằng "||".`);
        return;
      }
      if (idx < 0 || idx >= options.length) {
        errors.push(`Câu ${n}: đáp án phải là một chữ cái A–${LETTERS[options.length - 1]}.`);
        return;
      }
      ans = idx;
    } else {
      if (!pairs.g) {
        errors.push(`Câu ${n}: câu điền từ cần có chỗ trống "____".`);
        return;
      }
      if (box.length) {
        const idx = LETTERS.indexOf(rawAns.toUpperCase());
        const byWord = box.findIndex((w) => normalize(w) === normalize(rawAns));
        const pick = rawAns.length === 1 && idx >= 0 && idx < box.length ? idx : byWord;
        if (pick < 0) {
          errors.push(`Câu ${n}: đáp án "${rawAns}" không có trong word box.`);
          return;
        }
        ans = pick;
      } else {
        accept = rawAns.split('/').map((a) => a.trim()).filter(Boolean);
        ans = accept[0] ?? rawAns;
      }
    }
    if (!Object.keys(pairs).length) errors.push(`Câu ${n}: chưa đánh dấu từ khóa nào bằng [ngoặc vuông] — vẫn lưu được, nhưng nên đánh dấu để luyện ghép cặp.`);
    items.push({ stmt: text, pairs, ans, options, accept });
  });
  const blocking = errors.filter((e) => !e.includes('vẫn lưu được'));
  if (blocking.length || !items.length) return { set: null, errors };
  const cam = CAM_INDEX.find((c) => c.id === input.camId);
  const set: P3Set = {
    id: input.camId ? `my-${input.camId}` : `my-${Date.now().toString(36)}`,
    track: input.type === 'gap' ? 'B' : 'A',
    type: input.type,
    title: input.title.trim() || cam?.title || 'Đề của tôi',
    topic: cam ? `Cambridge ${cam.book} · Test ${cam.test} · Passage 3` : 'Đề tự nhập',
    passage: input.passage.trim(),
    box: input.type === 'gap' && box.length ? box : undefined,
    items,
    keyless: true,
    camId: input.camId,
  };
  return { set, errors };
}

/** The import form's text for a saved set, so it can be edited. */
export function toImportInput(set: P3Set): ImportInput {
  const questions = set.items
    .map((it) => {
      const stmt = it.stmt.replace(/\[g:____\]/g, '____').replace(/\[\w+:([^\]]+)\]/g, '[$1]').replace(/\{\w+:([^}]+)\}/g, '$1');
      let ans: string;
      if (set.type === 'tfng' || set.type === 'ynng') ans = JUDGE[set.type].find(([k]) => k === it.ans)?.[1] ?? String(it.ans);
      else if (set.type === 'mcq') return [stmt, ...(it.options ?? []), LETTERS[Number(it.ans)]].join(' || ');
      else ans = set.box?.length ? (LETTERS[Number(it.ans)] ?? '') : (it.accept ?? [String(it.ans)]).join(' / ');
      return `${stmt} || ${ans}`;
    })
    .join('\n');
  return { camId: set.camId, title: set.title, type: set.type, passage: set.passage, questions, box: (set.box ?? []).join('\n') };
}

export function saveImport(set: P3Set) {
  const list = getImports().filter((s) => s.id !== set.id);
  imports = [...list, set];
  write(IMPORTS, imports);
  // the questions may have changed: old answers no longer fit
  resetSet(set.id);
}

export function deleteImport(id: string) {
  imports = getImports().filter((s) => s.id !== id);
  write(IMPORTS, imports);
  resetSet(id);
}

/** Backup of the pasted sets (and progress) as one JSON file, to move them to another device. */
export function exportBackup(): string {
  return JSON.stringify({ app: 'linguaflow-p3', version: 1, imports: getImports(), progress: getProgress() }, null, 1);
}

export function importBackup(json: string): number {
  const data = JSON.parse(json) as { app?: string; imports?: P3Set[]; progress?: P3Progress };
  if (data.app !== 'linguaflow-p3' || !Array.isArray(data.imports)) throw new Error('File không phải bản sao lưu Passage 3 của LinguaFlow.');
  const byId = new Map(getImports().map((s) => [s.id, s]));
  for (const s of data.imports) if (s && typeof s.id === 'string' && typeof s.passage === 'string' && Array.isArray(s.items)) byId.set(s.id, { ...s, keyless: true });
  imports = [...byId.values()];
  write(IMPORTS, imports);
  if (data.progress) {
    const p = getProgress();
    p.items = { ...data.progress.items, ...p.items };
    p.done = { ...data.progress.done, ...p.done };
    p.days = [...new Set([...p.days, ...(data.progress.days ?? [])])];
    write(KEY, p);
  }
  emit();
  return data.imports.length;
}

/** test helper */
export function __resetForTests() {
  progress = null;
  imports = null;
}
