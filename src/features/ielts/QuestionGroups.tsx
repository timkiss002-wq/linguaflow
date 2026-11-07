import { Check, Search, X } from 'lucide-react';
import { Fragment } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
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
}

/** All question groups of one part: instructions, the questions, and (after marking) answers + explanations. */
export function QuestionGroups({
  groups,
  answers,
  onAnswer,
  review,
}: {
  groups: QuestionGroup[];
  answers: Record<number, string>;
  onAnswer: (n: number, value: string) => void;
  review?: Review;
}) {
  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const first = g.questions[0]?.n;
        const last = g.questions[g.questions.length - 1]?.n;
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
              {g.questions.map((q) => (
                <li key={q.n} id={`q-${q.n}`} className={cn('scroll-mt-24 rounded-md', review && 'border p-3', review?.active === q.n && 'ring-2 ring-warning/60')}>
                  <QuestionInput group={g} q={q} value={answers[q.n] ?? ''} onChange={(v) => onAnswer(q.n, v)} disabled={Boolean(review)} mark={review?.marks[q.n]} />
                  {review && <Feedback q={q} mark={review.marks[q.n] ?? 'empty'} onShowEvidence={() => review.onShowEvidence(q.n)} />}
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

function Feedback({ q, mark, onShowEvidence }: { q: Question; mark: Mark; onShowEvidence: () => void }) {
  const answer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
  return (
    <div className="mt-2 space-y-1.5 pl-8 text-sm" data-mark={mark}>
      <p className={cn('flex flex-wrap items-center gap-1.5 font-medium', mark === 'correct' ? 'text-success' : 'text-destructive')}>
        {mark === 'correct' ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
        {mark === 'correct' ? 'Đúng' : MARK_TEXT[mark]}
        {mark !== 'correct' && (
          <span className="text-foreground">
            · Đáp án: <strong>{answer}</strong>
            {Array.isArray(q.answer) && q.answer.length > 1 && <span className="text-muted-foreground"> (chấp nhận: {q.answer.join(' / ')})</span>}
          </span>
        )}
      </p>
      <p className="text-muted-foreground" lang="vi">
        {q.explain_vi}
      </p>
      <button type="button" onClick={onShowEvidence} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Search className="size-3.5" aria-hidden /> Xem chỗ có đáp án trong bài
      </button>
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
