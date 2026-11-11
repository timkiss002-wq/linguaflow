import { Check, Flag, MapPin, X } from 'lucide-react';
import { Fragment } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
import { useWordLookup } from '@/features/vocabulary/useWordLookup';
import { locationLabel, type Location } from '@/lib/ielts/locate';
import { optionsFor, type Mark, type Question, type QuestionGroup } from '@/lib/ielts/tests';
import { cn } from '@/lib/utils';

const MARK_TEXT: Record<Exclude<Mark, 'correct'>, string> = {
  empty: 'Chưa trả lời',
  wrong: 'Sai',
  spelling: 'Sai chính tả — trong bài thi tính là sai',
  too_long: 'Quá số từ cho phép — trong bài thi tính là sai',
};

export interface Review {
  marks: Record<number, Mark>;
  active: number | null;
  onShowEvidence: (n: number) => void;
  /** where a question's evidence sits (reading): paragraph + sentence; null when unknown */
  locate?: (q: Question) => Location | null;
  /** hide the questions answered correctly */
  onlyWrong?: boolean;
}

/** All question groups of one part: instructions, the questions, and (after marking) answers + explanations. */
export function QuestionGroups({
  groups,
  answers,
  onAnswer,
  review,
  current,
  onCurrent,
  flagged,
}: {
  groups: QuestionGroup[];
  answers: Record<number, string>;
  onAnswer: (n: number, value: string) => void;
  review?: Review;
  /** the question the learner is on (shown in the bottom navigator) */
  current?: number | null;
  onCurrent?: (n: number) => void;
  flagged?: Set<number>;
}) {
  const lookup = useWordLookup('en');
  return (
    <div className="space-y-6">
      {review && lookup.popover}
      {groups.map((g) => {
        const first = g.questions[0]?.n;
        const last = g.questions[g.questions.length - 1]?.n;
        const shown = review?.onlyWrong ? g.questions.filter((q) => review.marks[q.n] !== 'correct') : g.questions;
        if (!shown.length) return null;
        return (
          <section key={first} aria-label={`Questions ${first}–${last}`} className="space-y-3">
            <div>
              <h3 className="font-semibold">
                Questions {first}–{last}
              </h3>
              <p className="text-sm italic text-muted-foreground">{g.instructions}</p>
            </div>
            {(g.type === 'headings' || g.type === 'matching') && g.options && (
              <ul className="rounded-md border bg-muted/40 p-3 text-sm">
                {g.options.map(([k, t]) => (
                  <li key={k} className="flex gap-2">
                    <span className="w-8 shrink-0 font-semibold">{k}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
            {g.title && <p className="font-medium">{g.title}</p>}
            <ol className="space-y-3">
              {shown.map((q) => (
                <li
                  key={q.n}
                  id={`q-${q.n}`}
                  onFocusCapture={() => onCurrent?.(q.n)}
                  onPointerDown={() => onCurrent?.(q.n)}
                  className={cn('relative scroll-mt-4 rounded-md p-1.5 -m-1.5', review && 'm-0 border p-3', review?.active === q.n && 'ring-2 ring-warning/60', !review && current === q.n && 'bg-primary/5 ring-1 ring-primary/30')}
                >
                  {flagged?.has(q.n) && <Flag className="absolute -left-1 -top-1 size-3.5 fill-warning text-warning" aria-label="Đánh dấu xem lại" />}
                  <QuestionInput group={g} q={q} value={answers[q.n] ?? ''} onChange={(v) => onAnswer(q.n, v)} disabled={Boolean(review)} mark={review?.marks[q.n]} />
                  {review && <Feedback q={q} type={g.type} mark={review.marks[q.n] ?? 'empty'} location={review.locate?.(q) ?? null} onShowEvidence={() => review.onShowEvidence(q.n)} onWord={lookup.open} />}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function Num({ n, mark }: { n: number; mark?: Mark }) {
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        !mark ? 'bg-muted' : mark === 'correct' ? 'bg-success text-white' : 'bg-destructive text-white',
      )}
    >
      {n}
    </span>
  );
}

function QuestionInput({ group, q, value, onChange, disabled, mark }: { group: QuestionGroup; q: Question; value: string; onChange: (v: string) => void; disabled: boolean; mark?: Mark }) {
  const opts = optionsFor(group, q);

  if (group.type === 'gap') {
    const [before, after] = q.text.split('___');
    return (
      <div className="flex items-start gap-2">
        <Num n={q.n} mark={mark} />
        <p className="leading-8">
          {before}
          <input
            aria-label={`Answer ${q.n}`}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mx-1 h-8 w-40 rounded-md border border-input bg-card px-2 text-[15px] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-80"
          />
          {after}
        </p>
      </div>
    );
  }

  if (group.type === 'headings' || group.type === 'matching') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Num n={q.n} mark={mark} />
        <span className="min-w-0 flex-1">{q.text}</span>
        <div className="w-28">
          <NativeSelect aria-label={`Answer ${q.n}`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {opts.map(([k]) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    );
  }

  if (group.type === 'mcq') {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Num n={q.n} mark={mark} />
          <span>{q.text}</span>
        </div>
        <div className="grid gap-1.5 pl-8" role="radiogroup" aria-label={`Question ${q.n}`}>
          {opts.map(([k, t]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={value === k}
              disabled={disabled}
              onClick={() => onChange(k!)}
              className={cn('flex gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors enabled:hover:border-primary', value === k && 'border-primary bg-primary/10 font-medium')}
            >
              <span className="font-semibold">{k}</span> <span>{t}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // TRUE / FALSE / NOT GIVEN and YES / NO / NOT GIVEN
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Num n={q.n} mark={mark} />
        <span>{q.text}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 pl-8" role="radiogroup" aria-label={`Question ${q.n}`}>
        {opts.map(([k]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            disabled={disabled}
            onClick={() => onChange(k!)}
            className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition-colors enabled:hover:border-primary', value === k && 'border-primary bg-primary text-primary-foreground')}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Colour of an answer chip: TRUE/YES green, FALSE/NO red, NOT GIVEN neutral, everything else brand. */
function answerTone(answer: string) {
  if (answer === 'TRUE' || answer === 'YES') return 'bg-success text-success-foreground';
  if (answer === 'FALSE' || answer === 'NO') return 'bg-destructive text-destructive-foreground';
  if (answer === 'NOT GIVEN') return 'bg-muted-foreground/80 text-background';
  return 'bg-primary text-primary-foreground';
}

const TYPE_HINT: Partial<Record<QuestionGroup['type'], string>> = {
  tfng: 'TRUE = bài nói đúng như vậy · FALSE = bài nói ngược lại · NOT GIVEN = bài không nhắc tới ý này',
  ynng: 'YES = tác giả nghĩ vậy · NO = tác giả nghĩ ngược lại · NOT GIVEN = tác giả không nêu quan điểm',
};

/**
 * One word per click: the quoted sentence (and the question) as clickable words so the learner can
 * look a word up and save it with this sentence as its context.
 */
function Words({ text, sentence = text, onWord, className }: { text: string; sentence?: string; onWord: (t: { word: string; element: HTMLElement; sentence: string }) => void; className?: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <span lang="en" className={className}>
      {parts.map((p, i) => {
        if (!p.trim()) return <Fragment key={i}>{p}</Fragment>;
        const word = p.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        if (!word) return <Fragment key={i}>{p}</Fragment>;
        return (
          <span key={i} role="button" tabIndex={-1} className="cursor-pointer rounded-[3px] hover:bg-accent hover:text-accent-foreground" onClick={(e) => onWord({ word, element: e.currentTarget, sentence })}>
            {p}
          </span>
        );
      })}
    </span>
  );
}

/** The whole sentence, with the exact evidence fragment marked inside it. */
function Quote({ sentence, fragment, onWord }: { sentence: string; fragment: string; onWord: (t: { word: string; element: HTMLElement; sentence: string }) => void }) {
  const at = sentence.indexOf(fragment);
  if (at < 0 || fragment.length >= sentence.length - 2) return <Words text={sentence} onWord={onWord} />;
  return (
    <>
      <Words text={sentence.slice(0, at)} sentence={sentence} onWord={onWord} />
      <mark className="rounded bg-warning/20 px-0.5 not-italic text-foreground">
        <Words text={fragment} sentence={sentence} onWord={onWord} />
      </mark>
      <Words text={sentence.slice(at + fragment.length)} sentence={sentence} onWord={onWord} />
    </>
  );
}

/**
 * After marking: the answer, where it is in the text, the sentence that gives it, and why —
 * the same fixed order for every question, so the eye learns where to look.
 */
function Feedback({
  q,
  type,
  mark,
  location,
  onShowEvidence,
  onWord,
}: {
  q: Question;
  type: QuestionGroup['type'];
  mark: Mark;
  location: Location | null;
  onShowEvidence: () => void;
  onWord: (t: { word: string; element: HTMLElement; sentence: string }) => void;
}) {
  const answer = Array.isArray(q.answer) ? q.answer[0]! : q.answer;
  const ok = mark === 'correct';
  const quote = location?.sentence ?? q.evidence;
  return (
    <div className={cn('mt-3 space-y-2.5 rounded-lg border-l-4 bg-muted/40 p-3 text-sm', ok ? 'border-success' : 'border-destructive')} data-mark={mark}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={cn('inline-flex items-center gap-1 font-semibold', ok ? 'text-success' : 'text-destructive')}>
          {ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
          {ok ? 'Đúng' : MARK_TEXT[mark]}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Đáp án</span>
        <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold tracking-wide', answerTone(answer))}>{answer}</span>
        {Array.isArray(q.answer) && q.answer.length > 1 && <span className="text-xs text-muted-foreground">(chấp nhận: {q.answer.join(' / ')})</span>}
        <button type="button" onClick={onShowEvidence} className="ml-auto inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 text-xs font-medium text-primary hover:bg-accent" title="Cuộn bài đọc tới câu chứa đáp án">
          <MapPin className="size-3.5" aria-hidden />
          {location ? locationLabel(location) : 'Xem trong bài'}
        </button>
      </p>

      <blockquote className="border-l-2 border-warning/60 pl-3 italic leading-relaxed text-foreground/90">
        <Quote sentence={quote} fragment={q.evidence} onWord={onWord} />
      </blockquote>

      <div className="space-y-1" lang="vi">
        <p>
          <span className="font-medium">Giải thích: </span>
          {q.explain_vi}
        </p>
        {!ok && TYPE_HINT[type] && <p className="text-xs text-muted-foreground">{TYPE_HINT[type]}</p>}
      </div>
    </div>
  );
}

/** Text with the evidence quotes highlighted (numbered); the active one is stronger. */
export function Highlighted({ text, marks, active }: { text: string; marks: { n: number; quote: string }[]; active: number | null }) {
  const ranges = marks
    .map((m) => ({ n: m.n, start: text.indexOf(m.quote), end: text.indexOf(m.quote) + m.quote.length }))
    .filter((r) => r.start >= 0)
    .sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const r of ranges) {
    if (r.start < at) continue; // overlapping quotes: keep the first
    parts.push(<Fragment key={`t${at}`}>{text.slice(at, r.start)}</Fragment>);
    parts.push(
      <mark key={`m${r.n}`} id={`ev-${r.n}`} className={cn('scroll-mt-24 rounded px-0.5 text-foreground', active === r.n ? 'bg-warning/50 ring-2 ring-warning' : 'bg-warning/20')}>
        <sup className="mr-0.5 font-bold text-warning">{r.n}</sup>
        {text.slice(r.start, r.end)}
      </mark>,
    );
    at = r.end;
  }
  parts.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <>{parts}</>;
}
