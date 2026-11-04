/**
 * Today's plan (P4): a rule-based list of what to study today, sized to the daily goal, each item with its reason.
 * Pure: the app gathers the inputs, this decides. See docs/PERSONALIZATION.md §6 and §13.
 */
import type { Insight } from './insights';

export type Lang = 'en' | 'zh';
export type PlanKind = 'review' | 'test' | 'practice' | 'grammar' | 'writing' | 'lesson';

/** How an item is ticked off automatically (from get_plan_progress) — or by the learner ("manual"). */
export type PlanTarget =
  | { type: 'reviews'; count: number }
  | { type: 'sentences'; lessonId: string; count: number }
  | { type: 'practice'; count: number }
  | { type: 'word_forms'; count: number }
  | { type: 'test'; language: Lang }
  | { type: 'writing'; language: Lang }
  | { type: 'manual' };

export interface PlanItem {
  key: string;
  kind: PlanKind;
  language?: Lang;
  title: string;
  /** Extra text shown under the title, e.g. a grammar explanation or today's listening focus. */
  detail?: string;
  reason: string;
  minutes: number;
  href: string;
  target: PlanTarget;
}

export interface Plan {
  restDay: boolean;
  items: PlanItem[];
  notes: string[];
}

export interface LessonPick {
  id: string;
  title: string;
  language: Lang;
  /** Sentences left in the lesson. */
  remaining: number;
  /** "continue" = already started, otherwise a recommendation with its reasons. */
  continue: boolean;
  reasons: string[];
}

export interface PlanInput {
  /** yyyy-mm-dd in the learner's time zone. */
  today: string;
  goalMinutes: number;
  /** 0 = Sunday … 6 = Saturday */
  studyDays: number[];
  /** Cards in today's review queue (due + new). */
  dueCards: number;
  /** Language with the most cards in the queue: the review link opens it. */
  dueLanguage?: Lang;
  /** Languages from the learner's goals (may be empty). */
  goals: { language: Lang; examDate: string | null }[];
  /** Level tests: never finished / unfinished test / check-in due. */
  tests: Partial<Record<Lang, { state: 'none' | 'open' | 'due' | 'ok'; openId?: string }>>;
  /** Weak spots from the strengths & weaknesses analysis (P2). */
  insights: Insight[];
  /** Grammar points missed in the latest level test (P3). */
  missedPoints: { language: Lang; code: string; name: string; vi: string; testId: string }[];
  /** Best lesson per language (continue an unfinished one, else the top recommendation). */
  lessons: Partial<Record<Lang, LessonPick>>;
  /** Where the lesson level came from, per language, e.g. "HSK 3 from your level test". */
  levelSource: Partial<Record<Lang, string>>;
  /** Times each kind was skipped in the last 14 days. */
  skips: Partial<Record<PlanKind, number>>;
  /** Texts written in the last 7 days (Writing, P5). */
  writingsLast7?: number;
  /** Average real session length (habit analysis), null when unknown or habits are off. */
  avgSessionMinutes: number | null;
}

const LANG_NAME: Record<Lang, string> = { en: 'English', zh: 'Chinese' };
export const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
/** Cards reviewed per minute, sentences dictated per minute (measured roughly on the demo lessons). */
const CARDS_PER_MIN = 4;
const SENTENCES_PER_MIN = 0.8;
const OFTEN_SKIPPED = 3;

/** Which language today's lesson is in: the nearer exam (within 60 days) wins, otherwise alternate by day. */
export function focusLanguage(input: Pick<PlanInput, 'goals' | 'today'>): Lang | null {
  const langs = input.goals.map((g) => g.language);
  if (langs.length === 0) return null;
  if (langs.length === 1) return langs[0]!;
  const soon = input.goals
    .filter((g) => g.examDate)
    .map((g) => ({ g, days: dayNumber(g.examDate!) - dayNumber(input.today) }))
    .filter((x) => x.days >= 0 && x.days <= 60)
    .sort((a, b) => a.days - b.days);
  if (soon.length) return soon[0]!.g.language;
  return langs[dayNumber(input.today) % langs.length]!;
}

/** Actionable weak spots become a practice item; listening patterns become the "focus" of today's lesson. */
const PRACTICE_INSIGHTS: Record<string, (i: Insight) => { title: string; href: string; target: PlanTarget } | null> = {
  leeches: (i) => ({ title: 'Retype the words you keep forgetting', href: i.action!.href, target: { type: 'practice', count: 5 } }),
  'en-word-forms': () => ({ title: 'Word forms practice', href: '/word-forms', target: { type: 'word_forms', count: 10 } }),
  'en-spelling': (i) => ({ title: 'Typing practice: spelling', href: i.action?.href ?? '/vocabulary/practice?lang=en', target: { type: 'practice', count: 10 } }),
  'typing-en': (i) => ({ title: 'Typing practice (English)', href: i.action?.href ?? '/vocabulary/practice?lang=en', target: { type: 'practice', count: 10 } }),
  'typing-zh': (i) => ({ title: 'Typing practice (汉字)', href: i.action?.href ?? '/vocabulary/practice?lang=zh', target: { type: 'practice', count: 10 } }),
  'zh-same-sound': () => ({ title: 'Same-sound characters drill', href: '/insights#drill', target: { type: 'manual' } }),
};
const FOCUS_INSIGHTS = ['zh-tones', 'zh-initial', 'zh-final', 'zh-particles', 'en-endings', 'en-function-words'];

export function buildPlan(input: PlanInput): Plan {
  const items: PlanItem[] = [];
  const notes: string[] = [];
  const goal = Math.max(5, input.goalMinutes);
  const restDay = !input.studyDays.includes(weekday(input.today));
  const day = dayNumber(input.today);
  const often = (k: PlanKind) => (input.skips[k] ?? 0) >= OFTEN_SKIPPED;
  const focus = focusLanguage(input);

  // 1. Reviews first: they're due today and forgetting starts tomorrow. At most 40% of the time (10 min on rest days).
  if (input.dueCards > 0) {
    const cap = restDay ? 10 : Math.max(2, Math.floor(goal * 0.4));
    const minutes = Math.min(cap, Math.max(2, Math.ceil(input.dueCards / CARDS_PER_MIN)));
    const count = Math.min(input.dueCards, minutes * CARDS_PER_MIN);
    items.push({
      key: 'review',
      kind: 'review',
      title: count < input.dueCards ? `Review ${count} of ${input.dueCards} flashcards` : `Review ${count} flashcard${count === 1 ? '' : 's'}`,
      reason: `${input.dueCards} card${input.dueCards === 1 ? ' is' : 's are'} due today — reviewing on time is what keeps words from being forgotten.`,
      minutes,
      href: input.dueLanguage ? `/review?lang=${input.dueLanguage}` : '/review',
      target: { type: 'reviews', count },
    });
  }

  if (restDay) {
    notes.push(
      items.length
        ? "Today isn't one of your study days, so the plan is just a light review. Feel free to do more."
        : "Today isn't one of your study days and nothing is due. Enjoy the rest!",
    );
    return { restDay, items, notes };
  }

  let left = goal - items.reduce((n, i) => n + i.minutes, 0);

  // 2. Level test: finish an open one, take a first one, or the 2-weekly check-in.
  const testLangs = (focus ? [focus, ...input.goals.map((g) => g.language).filter((l) => l !== focus)] : []) as Lang[];
  for (const lang of testLangs) {
    const t = input.tests[lang];
    if (!t || t.state === 'ok') continue;
    const minutes = t.state === 'due' ? 6 : 12;
    items.push({
      key: `test-${lang}`,
      kind: 'test',
      language: lang,
      title: t.state === 'open' ? `Finish your ${LANG_NAME[lang]} level test` : t.state === 'none' ? `${LANG_NAME[lang]} placement test` : `${LANG_NAME[lang]} check-in (10 questions)`,
      reason:
        t.state === 'open'
          ? 'You started it already — the plan picks lessons from its result.'
          : t.state === 'none'
            ? 'It sets your level per skill, so lessons and practice fit you.'
            : 'Two weeks since your last test: see what improved.',
      minutes,
      href: t.state === 'open' && t.openId ? `/level-test/${t.openId}` : '/level-test',
      target: { type: 'test', language: lang },
    });
    left -= minutes;
    break; // one test a day is enough
  }

  // 3. One weak spot: a grammar point missed in the last test, or a practice for a weakness found in your answers.
  const candidates: Omit<PlanItem, 'minutes'>[] = [
    ...input.missedPoints.map((p) => ({
      key: `grammar-${p.code}`,
      kind: 'grammar' as const,
      language: p.language,
      title: `Grammar: ${p.name}`,
      detail: p.vi,
      reason: 'You missed this in your last level test. Read the rule, then look at the question again.',
      href: `/level-test/${p.testId}`,
      target: { type: 'manual' as const },
    })),
    ...input.insights.flatMap((i) => {
      const make = PRACTICE_INSIGHTS[i.id];
      const p = i.kind === 'weakness' && make ? make(i) : null;
      return p ? [{ key: `practice-${i.id}`, kind: 'practice' as const, language: i.language, title: p.title, reason: `${i.detail} (${i.evidence})`, href: p.href, target: p.target }] : [];
    }),
  ];
  if (candidates.length && left > 0) {
    const pick = candidates[day % candidates.length]!;
    const minutes = often(pick.kind) ? 3 : 5;
    items.push({ ...pick, minutes, reason: often(pick.kind) ? `${pick.reason} Shorter today because you often skip this.` : pick.reason });
    left -= minutes;
  }

  // 4. Writing every other day, until 3 texts this week — only when there is room for it and a lesson.
  if (focus && (input.writingsLast7 ?? 0) < 3 && day % 2 === 1 && left >= 15) {
    const minutes = often('writing') ? 7 : 10;
    items.push({
      key: `writing-${focus}`,
      kind: 'writing',
      language: focus,
      title: `Write a short ${LANG_NAME[focus]} text`,
      reason: `${input.writingsLast7 ?? 0} of 3 texts this week. Writing uses the words you are learning — the analysis shows what to work on.${often('writing') ? ' Shorter today because you often skip this.' : ''}`,
      minutes,
      href: `/writing?lang=${focus}`,
      target: { type: 'writing', language: focus },
    });
    left -= minutes;
  }

  // 5. A lesson with the rest of the time (at least 5 minutes).
  const lesson = focus ? input.lessons[focus] : undefined;
  if (lesson) {
    const minutes = Math.max(5, left);
    const count = Math.max(1, Math.min(lesson.remaining, Math.round(minutes * SENTENCES_PER_MIN)));
    const focusTip = input.insights.find((i) => i.kind === 'weakness' && i.language === lesson.language && FOCUS_INSIGHTS.includes(i.id));
    const why = lesson.continue
      ? `You started this lesson — ${lesson.remaining} sentence${lesson.remaining === 1 ? '' : 's'} to go.`
      : [lesson.reasons.join(' · '), input.levelSource[lesson.language]].filter(Boolean).join(' — ');
    items.push({
      key: `lesson-${lesson.id}`,
      kind: 'lesson',
      language: lesson.language,
      title: `${lesson.continue ? 'Continue' : 'Dictation'}: ${lesson.title} · ${count} sentence${count === 1 ? '' : 's'}`,
      detail: focusTip ? `Today's focus — ${focusTip.title.toLowerCase()}: ${focusTip.detail}` : undefined,
      reason: why ? why[0]!.toUpperCase() + why.slice(1) : 'A lesson at your level.',
      minutes,
      href: `/lessons/${lesson.id}/practice`,
      target: { type: 'sentences', lessonId: lesson.id, count },
    });
  }

  // Habits and choices that should change the plan itself.
  if (input.goals.length === 0) notes.push('Set your goals in the learning profile to get lessons and level tests in your plan.');
  if (input.avgSessionMinutes !== null && input.avgSessionMinutes >= 1 && input.avgSessionMinutes < goal * 0.6) {
    notes.push(`Your sessions last about ${Math.round(input.avgSessionMinutes)} min but your daily goal is ${goal} min. A goal you reach every day beats a bigger one you skip — you can change it in Settings.`);
  }
  if (often('lesson')) notes.push('You often skip the lesson. Try the slow replay or an easier lesson — or lower your daily goal.');
  return { restDay, items, notes };
}

/** Progress 0–1 of an item, from what was done today. */
export interface TodayProgress {
  reviews: number;
  sentences: Record<string, number>;
  practice: number;
  word_forms: number;
  tests: Lang[];
  writings?: Lang[];
}

export function itemProgress(item: PlanItem, p: TodayProgress | undefined): number {
  if (!p) return 0;
  const t = item.target;
  const ratio = (a: number, b: number) => Math.min(1, b > 0 ? a / b : 1);
  switch (t.type) {
    case 'reviews':
      return ratio(p.reviews, t.count);
    case 'sentences':
      return ratio(p.sentences[t.lessonId] ?? 0, t.count);
    case 'practice':
      return ratio(p.practice, t.count);
    case 'word_forms':
      return ratio(p.word_forms, t.count);
    case 'test':
      return p.tests.includes(t.language) ? 1 : 0;
    case 'writing':
      return p.writings?.includes(t.language) ? 1 : 0;
    default:
      return 0;
  }
}

/** Skips per kind over stored plans. */
export function countSkips(plans: { items: PlanItem[]; status: Record<string, string> }[]): Partial<Record<PlanKind, number>> {
  const out: Partial<Record<PlanKind, number>> = {};
  for (const p of plans)
    for (const i of p.items) if (p.status[i.key] === 'skipped') out[i.kind] = (out[i.kind] ?? 0) + 1;
  return out;
}
