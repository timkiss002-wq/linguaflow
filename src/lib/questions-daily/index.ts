import data from "../../../content/daily/questions.json";
import type { WriteItem } from "@/lib/practice/items";
import { daysBetween } from "@/lib/roadmap/plan";

/**
 * Daily question forming: 5 questions a day, either "ask about the [part in brackets]" of an answer, or a situation in
 * Vietnamese to ask about in English. Six levels follow the grammar path: to be → do / does → continuous and past →
 * will / going to and how much / how long → present perfect and modals → subject questions, prepositions at the end,
 * passive and indirect questions. Questions answered wrong come back first on later days (shared "answered wrong" list)
 * and count towards "Câu hỏi & trợ động từ" in the weak points. Two of the five are everyday questions (the bill, more
 * paper in the exam room, sizes in a shop, the way to the station…), open from the first day. "Luyện thêm" gives 5 more, as often as wanted.
 * Source text: content/daily/questions.txt (built by scripts/build-questions-daily.mjs).
 */

interface RawGroup {
  id: string;
  level: number;
  tags: string[];
  name: string;
  tip: string;
  items: { k: "ask" | "vi"; p: string; en: string[]; w: string }[];
}
export const Q_GROUPS = (data as { groups: RawGroup[] }).groups;

export const Q_START = "2026-11-19";
export const PER_DAY = 5;
/** of the 5, everyday questions (bill, exam room, shop, directions…), open from the first day */
export const LIFE_PER_DAY = 2;
export const isLife = (group: string) => group.startsWith("life-");
export const Q_LEVELS = [
  {
    n: 1,
    from: 0,
    name: "Câu hỏi với to be",
    focus:
      "What / Where / Who / How old + am · is · are · Are you …? · Is there …?",
  },
  {
    n: 2,
    from: 7,
    name: "Do / does",
    focus: "Where does she work? (works → work) · Do you …? · How often …?",
  },
  {
    n: 3,
    from: 18,
    name: "Tiếp diễn & quá khứ",
    focus:
      "What are you doing? · Where did you go? (went → go) · Why was she late?",
  },
  {
    n: 4,
    from: 32,
    name: "Tương lai & số lượng",
    focus: "will / be going to · How much / many / long / far · Which · Whose",
  },
  {
    n: 5,
    from: 46,
    name: "Hoàn thành & khuyết thiếu",
    focus:
      "Have you ever …? · How long have you …? · Should I …? · Do I have to …?",
  },
  {
    n: 6,
    from: 63,
    name: "Câu hỏi nâng cao",
    focus:
      "Who called you? vs Who did you call? · giới từ cuối câu · bị động · Could you tell me where … is?",
  },
];

export const qLevelOf = (date: string) => {
  const d = Math.max(0, daysBetween(Q_START, date));
  return [...Q_LEVELS].reverse().find((l) => d >= l.from)!.n;
};

export interface QItem extends WriteItem {
  level: number;
  group: string;
  /** grammar points (translate-daily TAGS) a mistake counts towards */
  tags: string[];
  /** everyday situation (restaurant, exam room, shop, travel…) rather than a grammar drill */
  life: boolean;
}

/**
 * Polite requests have several right forms: Could ↔ Can ↔ May I …?, Could you ↔ Can you …?, with or without
 * "please". The written answers are kept first (the model answer), the variants are accepted too.
 */
export function politeVariants(answers: string[]): string[] {
  const out: string[] = [];
  const push = (a: string) => {
    const t = a
      .replace(/\s+/g, " ")
      .replace(/\s+([?.!,])/g, "$1")
      .trim();
    if (t && !out.includes(t)) out.push(t);
  };
  for (const a of answers) {
    const forms = [a];
    const m = /^(Could|Can|May) I /.exec(a);
    if (m)
      for (const w of ["Could", "Can", "May"])
        forms.push(a.replace(/^(Could|Can|May) I /, `${w} I `));
    if (/^(Could|Can) you /.test(a))
      for (const w of ["Could", "Can"])
        forms.push(a.replace(/^(Could|Can) you /, `${w} you `));
    for (const f of forms) {
      push(f);
      if (/,? please\?$/.test(f)) push(f.replace(/,? please\?$/, "?"));
      else if (/^(Could|Can|May) (I|you|we) /.test(f) && f.endsWith("?"))
        push(`${f.slice(0, -1)}, please?`);
    }
  }
  return out;
}

/** "[at 9 a.m.]" marks the part to ask about; the hint is the first word of the model question. */
export const Q_ITEMS: QItem[] = Q_GROUPS.flatMap((g) =>
  g.items.map((it, i) => ({
    key: `q:${g.id}:${i}`,
    prompt: it.p,
    en: g.id.startsWith("life-") ? politeVariants(it.en) : it.en,
    why: it.w,
    hint: `Bắt đầu bằng: ${it.en[0]!.split(" ")[0]} …`,
    task:
      it.k === "ask"
        ? "Đặt câu hỏi cho phần được tô màu"
        : "Đặt câu hỏi bằng tiếng Anh",
    label: g.name,
    diagnose: g.tags,
    level: g.level,
    group: g.id,
    tags: g.tags,
    life: isLife(g.id),
  })),
);
const BY_KEY = new Map(Q_ITEMS.map((q) => [q.key, q]));
export const qItemsOf = (keys: string[]) =>
  keys.map((k) => BY_KEY.get(k)).filter((q): q is QItem => Boolean(q));
export const qGroupOf = (id: string) => Q_GROUPS.find((g) => g.id === id);

/* ---------- choosing ---------- */

export type SeenLog = Record<string, string>;

/**
 * Up to 2 answered wrong before; then 2 everyday questions (out of 5) not seen for the longest time; the rest from the
 * grammar track: the current level (oldest seen first, in content order) with one in five from earlier levels.
 */
export function pickQuestions(
  date: string,
  wrongIds: string[],
  seen: SeenLog,
  n = PER_DAY,
  exclude: string[] = [],
): string[] {
  const level = qLevelOf(date);
  const skip = new Set(exclude);
  const open = Q_ITEMS.filter((q) => q.level <= level && !skip.has(q.key));
  const wrong = new Set(wrongIds);
  const out = open.filter((q) => wrong.has(q.key)).slice(0, Math.min(2, n));
  const byAge = (xs: QItem[]) =>
    [...xs].sort(
      (a, b) =>
        (seen[a.key] ?? "").localeCompare(seen[b.key] ?? "") ||
        Q_ITEMS.indexOf(a) - Q_ITEMS.indexOf(b),
    );
  const fresh = (q: QItem) => !out.includes(q);
  // everyday: one question from each of the groups used least recently (bill, exam room, shop, directions…)
  const life = byAge(open.filter((q) => q.life && fresh(q)));
  const lastUse = (g: string) =>
    Q_ITEMS.filter((q) => q.group === g).reduce(
      (m, q) => ((seen[q.key] ?? "") > m ? seen[q.key]! : m),
      "",
    );
  const lifeGroups = [
    ...new Set(Q_ITEMS.filter((q) => q.life).map((q) => q.group)),
  ].sort((x, y) => lastUse(x).localeCompare(lastUse(y)));
  const lifeOrder: QItem[] = [];
  for (let i = 0; lifeOrder.length < life.length; i++)
    for (const g of lifeGroups) {
      const q = life.filter((x) => x.group === g)[i];
      if (q) lifeOrder.push(q);
    }
  const lifeWant = Math.max(
    0,
    Math.round((n * LIFE_PER_DAY) / PER_DAY) - out.filter((q) => q.life).length,
  );
  out.push(...lifeOrder.slice(0, Math.min(lifeWant, n - out.length)));
  const grammar = open.filter((q) => !q.life && fresh(q));
  const current = byAge(grammar.filter((q) => q.level === level));
  const earlier = byAge(grammar.filter((q) => q.level < level));
  const fromEarlier = earlier.length
    ? Math.max(1, Math.floor((n - out.length) / 5))
    : 0;
  out.push(...current.slice(0, n - out.length - fromEarlier));
  out.push(...earlier.slice(0, n - out.length));
  out.push(
    ...[...current, ...lifeOrder].filter(fresh).slice(0, n - out.length),
  );
  return out.map((q) => q.key);
}

/* ---------- kept in this browser ---------- */

const SEEN_KEY = "questions:seen:v1";
const readSeen = (): SeenLog => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as SeenLog;
  } catch {
    return {};
  }
};
const markSeen = (keys: string[], date: string) => {
  try {
    const seen = readSeen();
    for (const k of keys) seen[k] = date;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* private mode */
  }
};

/** The day's 5 questions, chosen the first time the day is opened and kept for that day. */
export function questionSetFor(date: string, wrongIds: string[]): string[] {
  const key = `questions:set:${date}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as string[];
    const set = pickQuestions(date, wrongIds, readSeen());
    markSeen(set, date);
    localStorage.setItem(key, JSON.stringify(set));
    return set;
  } catch {
    return pickQuestions(date, wrongIds, {});
  }
}

/** Extra round n (1, 2, …) of a day: 5 more, never one already given that day. Kept so a reload shows the same ones. */
export function extraSetFor(
  date: string,
  round: number,
  wrongIds: string[],
): string[] {
  const key = `questions:extra:${date}:${round}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as string[];
    const given = [
      ...(JSON.parse(
        localStorage.getItem(`questions:set:${date}`) ?? "[]",
      ) as string[]),
    ];
    for (let r = 1; r < round; r++)
      given.push(
        ...(JSON.parse(
          localStorage.getItem(`questions:extra:${date}:${r}`) ?? "[]",
        ) as string[]),
      );
    let set = pickQuestions(date, wrongIds, readSeen(), PER_DAY, given);
    // everything open has been given today: start over with the oldest
    if (set.length < PER_DAY)
      set = [
        ...set,
        ...pickQuestions(date, [], readSeen(), PER_DAY - set.length, set),
      ];
    markSeen(set, date);
    localStorage.setItem(key, JSON.stringify(set));
    return set;
  } catch {
    return pickQuestions(date, wrongIds, {}, PER_DAY);
  }
}

/** How many extra rounds were started on a day. */
export function extraRounds(date: string): number {
  try {
    let r = 0;
    while (localStorage.getItem(`questions:extra:${date}:${r + 1}`)) r++;
    return r;
  } catch {
    return 0;
  }
}
