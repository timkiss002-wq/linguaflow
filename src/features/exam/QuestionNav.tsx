import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavPart {
  id: string;
  title: string;
  numbers: number[];
}
export type NavMark = 'correct' | 'wrong';

/**
 * The bottom bar of the computer-delivered test: a "Review" flag for the current question,
 * every question of the current part as a box (empty · answered · flagged), the other parts collapsed, and ← →.
 */
export function QuestionNav({
  parts,
  part,
  current,
  isAnswered,
  flagged,
  marks,
  onGo,
  onPart,
  onFlag,
  onStep,
}: {
  parts: NavPart[];
  part: number;
  current: number | null;
  isAnswered: (n: number) => boolean;
  flagged: Set<number>;
  /** after submitting: right / wrong per question */
  marks?: Record<number, NavMark>;
  onGo: (n: number) => void;
  onPart: (i: number) => void;
  onFlag: () => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const isFlagged = current !== null && flagged.has(current);
  return (
    <>
      {!marks && (
        <button
          type="button"
          onClick={onFlag}
          disabled={current === null}
          aria-pressed={isFlagged}
          title="Đánh dấu câu này để xem lại (phím F)"
          className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium disabled:opacity-50', isFlagged ? 'border-warning bg-warning/15 text-warning' : 'hover:bg-muted')}
          data-testid="flag"
        >
          <Flag className={cn('size-4', isFlagged && 'fill-current')} aria-hidden /> Xem lại
        </button>
      )}
      <nav aria-label="Danh sách câu hỏi" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {parts.map((p, i) => {
          const done = p.numbers.filter(isAnswered).length;
          if (i !== part)
            return (
              <button key={p.id} type="button" onClick={() => onPart(i)} className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                <span className="font-semibold">{p.title}</span>{' '}
                <span className="tabular-nums">{marks ? `${p.numbers.filter((n) => marks[n] === 'correct').length}/${p.numbers.length} đúng` : `${done}/${p.numbers.length}`}</span>
              </button>
            );
          return (
            <div key={p.id} className="flex shrink-0 items-center gap-1" role="group" aria-label={p.title}>
              <span className="mr-1 text-sm font-semibold">{p.title}</span>
              {p.numbers.map((n) => {
                const mark = marks?.[n];
                const answered = isAnswered(n);
                const flag = flagged.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onGo(n)}
                    aria-current={current === n ? 'true' : undefined}
                    aria-label={`Câu ${n}${mark ? (mark === 'correct' ? ', đúng' : ', sai') : answered ? ', đã làm' : ', chưa làm'}${flag ? ', đánh dấu xem lại' : ''}`}
                    data-q={n}
                    data-state={mark ?? (flag ? 'flagged' : answered ? 'answered' : 'empty')}
                    className={cn(
                      'relative inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1 text-xs font-semibold tabular-nums transition-colors',
                      mark === 'correct'
                        ? 'border-success bg-success text-success-foreground'
                        : mark === 'wrong'
                          ? 'border-destructive bg-destructive text-destructive-foreground'
                          : answered
                            ? 'border-foreground/70 bg-foreground text-background'
                            : 'bg-card hover:border-foreground/60',
                      current === n && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                      flag && !mark && 'border-2 border-warning',
                    )}
                  >
                    {n}
                    {flag && <Flag className="absolute -right-1 -top-1.5 size-3 fill-warning text-warning" aria-hidden />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => onStep(-1)} className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-muted" aria-label="Câu trước (←)" title="Câu trước (←)">
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" onClick={() => onStep(1)} className="inline-flex size-9 items-center justify-center rounded-md bg-foreground text-background hover:opacity-90" aria-label="Câu sau (→)" title="Câu sau (→)">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </>
  );
}
