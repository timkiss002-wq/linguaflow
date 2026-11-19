import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { recordAnswer, type Mcq } from '@/lib/practice-daily';
import { cn } from '@/lib/utils';

const PASS = 0.5;
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Multiple choice, one question at a time: pick an option (or press 1–4 / A–D), see right or wrong with the reason,
 * go on. The first round is scored; under 50 % only the questions answered wrong are done again, until right.
 */
export function McqRunner({ items, onFinish, extra }: { items: Mcq[]; onFinish: (score: number, total: number, passed: boolean) => void; extra?: ReactNode }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [first, setFirst] = useState<Record<number, boolean>>({});
  const [round, setRound] = useState(1);
  const [fixed, setFixed] = useState<Set<number>>(new Set());
  const done = pos >= order.length;
  const idx = order[pos]!;
  const item = items[idx];

  const score = Object.values(first).filter(Boolean).length;
  const wrong = items.map((_, i) => i).filter((i) => first[i] === false && !fixed.has(i));
  const rateOk = items.length ? score / items.length >= PASS : true;
  const passed = done && (rateOk || wrong.length === 0);

  useEffect(() => {
    if (done) onFinish(score, items.length, rateOk || wrong.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const choose = (k: number) => {
    if (picked !== null || !item) return;
    setPicked(k);
    const ok = k === item.a;
    if (round === 1) {
      setFirst((f) => ({ ...f, [idx]: ok }));
      recordAnswer(item.id, ok);
    } else if (ok) setFixed((s) => new Set(s).add(idx));
  };
  const next = () => {
    setPicked(null);
    setPos((p) => p + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (picked === null && n >= 0 && item && n < item.o.length) choose(n);
      else if (picked !== null && e.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    const pct = items.length ? Math.round((score / items.length) * 100) : 100;
    return (
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-5xl" aria-hidden>
            {passed ? '🏆' : pct >= 60 ? '👍' : '💪'}
          </p>
          <h2 className="text-2xl font-bold">
            {score}/{items.length} câu đúng ngay lần đầu ({pct}%)
          </h2>
          <p className="text-muted-foreground" data-testid="mcq-status">
            {passed ? 'Đạt yêu cầu — đã xong bài hôm nay. Câu sai sẽ quay lại ở những ngày sau.' : `Chưa đạt 50%. Làm lại ${wrong.length} câu sai — chọn đúng là qua.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!passed && (
              <Button
                autoFocus
                onClick={() => {
                  setOrder(wrong);
                  setPos(0);
                  setRound((r) => r + 1);
                }}
              >
                <RotateCcw /> Làm lại {wrong.length} câu sai
              </Button>
            )}
            {extra}
          </div>
          {items.some((_, i) => first[i] === false) && (
            <ul className="mx-auto max-w-2xl divide-y rounded-lg border text-left text-sm">
              {items.map((m, i) =>
                first[i] === false ? (
                  <li key={m.id} className="space-y-0.5 px-3 py-2">
                    <p className="font-medium" lang="en">
                      {m.q}
                    </p>
                    <p>
                      Đáp án: <b lang="en">{m.o[m.a]}</b>
                    </p>
                    <p className="text-muted-foreground">{m.w}</p>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between gap-2 text-sm text-muted-foreground">
          <span>{round > 1 ? 'Làm lại câu sai' : item!.label}</span>
          <span className="tabular-nums">
            Câu {pos + 1}/{order.length}
          </span>
        </div>
        <Progress value={(pos / order.length) * 100} className="h-1.5" label="Tiến độ" />
      </div>
      <Card>
        <CardContent className="space-y-5 pt-6">
          {round > 1 && <p className="text-xs font-medium text-muted-foreground">{item!.label}</p>}
          <p className="text-xl font-semibold leading-snug sm:text-2xl" lang="en" data-testid="mcq-question">
            {item!.q}
          </p>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Các lựa chọn">
            {item!.o.map((o, k) => {
              const isAnswer = k === item!.a;
              const state = picked === null ? 'idle' : isAnswer ? 'right' : k === picked ? 'wrong' : 'other';
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => choose(k)}
                  disabled={picked !== null}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 text-left font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    state === 'idle' && 'bg-card hover:border-primary/50 hover:bg-accent/60',
                    state === 'right' && 'border-success bg-success/10 text-foreground',
                    state === 'wrong' && 'border-destructive bg-destructive/10 text-foreground',
                    state === 'other' && 'bg-card opacity-60',
                  )}
                  data-option={k}
                >
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold', state === 'right' ? 'bg-success text-success-foreground' : state === 'wrong' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground')}>
                    {LETTERS[k]}
                  </span>
                  <span lang="en">{o}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className={cn('flex gap-2 rounded-lg border p-3 text-sm', picked === item!.a ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5')} role="status">
              {picked === item!.a ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />}
              <p>
                <b>{picked === item!.a ? 'Đúng. ' : `Chưa đúng — đáp án ${LETTERS[item!.a]}: ${item!.o[item!.a]}. `}</b>
                {item!.w}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Phím tắt: 1–4 để chọn, Enter để sang câu sau.</p>
            {picked !== null && (
              <Button onClick={next} autoFocus>
                Câu tiếp <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
