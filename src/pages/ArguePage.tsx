import { ArrowLeft, ArrowRight, Check, ListOrdered, RotateCcw, Scale, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { McqRunner } from '@/features/daily/McqRunner';
import { ARGUE_LEVELS, ROLE_INFO, argueLevelOf, argueSetFor, paragraphById, questionsOf, readOrder, saveOrder, shuffleSeeded, type Paragraph, type Role } from '@/lib/argue-daily';
import { readWrong } from '@/lib/practice-daily';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { dayByDate, formatDay } from '@/lib/roadmap/plan';
import { cn } from '@/lib/utils';

const ROLE_TONE: Record<Role, string> = {
  P: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  E: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200',
  X: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  L: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200',
  O: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
  R: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
};

/**
 * /lap-luan/:date — argument skills of the day: step 1, put the sentences of a body paragraph in order and see the
 * role of each one; step 2, four questions on topic sentences, examples, weak arguments, hedging and rebuttals.
 */
export default function ArguePage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const [step, setStep] = useState<'intro' | 'order' | 'mcq'>('intro');
  const [, setTick] = useState(0);
  const set = useMemo(() => (day ? argueSetFor(date, Object.keys(readWrong())) : null), [day, date]);
  const para = set ? paragraphById(set.paragraph) : undefined;
  const questions = useMemo(() => (set ? questionsOf(set) : []), [set]);
  if (!day || !set || !para) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;

  const taskId = `${date}:argue`;
  const level = ARGUE_LEVELS[argueLevelOf(date) - 1]!;
  const order = readOrder(date);
  const best = practiceOf(taskId);

  if (step === 'order')
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('intro')}>
          <ArrowLeft /> Lập luận · {formatDay(date)}
        </Button>
        <Ordering
          para={para}
          seed={`${date}:${para.id}`}
          onChecked={(firstTry, done) => {
            saveOrder(date, { firstTry, done });
            setTick((t) => t + 1);
          }}
          onNext={() => setStep('mcq')}
        />
      </div>
    );

  if (step === 'mcq')
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('intro')}>
          <ArrowLeft /> Lập luận · {formatDay(date)}
        </Button>
        <p className="text-sm font-medium">Bước 2/2 · Chọn câu lập luận tốt</p>
        <McqRunner
          items={questions}
          onFinish={(score, total, passed) => {
            const o = readOrder(date) ?? { firstTry: false, done: false };
            savePractice(taskId, score + (o.firstTry ? 1 : 0), total + 1, passed && o.done);
            setTick((t) => t + 1);
          }}
          extra={
            !readOrder(date)?.done ? (
              <Button variant="outline" onClick={() => setStep('order')}>
                Quay lại bước 1 (chưa xếp xong đoạn văn)
              </Button>
            ) : undefined
          }
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Bài tập hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Lập luận & dẫn dắt</h1>
        <p className="max-w-3xl text-muted-foreground">
          Bước 1: xếp {para.s.length} câu thành một đoạn thân bài hoàn chỉnh và xem vai trò từng câu. Bước 2: {questions.length} câu hỏi chọn câu chủ đề, ví dụ, cách nói giảm và nhận ra lập luận yếu — đúng những gì giám khảo chấm ở tiêu chí Task Response và Coherence.
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 bg-accent/40 p-4" aria-labelledby="lv">
        <p id="lv" className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          <Scale className="size-4" aria-hidden /> Cấp {level.n}/{ARGUE_LEVELS.length} · {level.name}
        </p>
        <p className="mt-1 text-sm">{level.focus}</p>
      </section>

      <section aria-labelledby="roles" className="space-y-2">
        <h2 id="roles" className="text-sm font-semibold">
          Cấu trúc một đoạn thân bài
        </h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {[...new Set(para.s.map((x) => x.r))].map((r) => (
            <li key={r} className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold', ROLE_TONE[r])}>{ROLE_INFO[r].name}</span>
              <span className="text-muted-foreground">{ROLE_INFO[r].tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setStep('order')} autoFocus data-testid="start-argue">
          <ListOrdered /> {order ? 'Xếp lại đoạn văn' : 'Bắt đầu'} · đoạn “{para.topic}”
        </Button>
        {order?.done && (
          <Button size="lg" variant={best?.passed ? 'outline' : 'default'} onClick={() => setStep('mcq')}>
            Bước 2 · {questions.length} câu hỏi <ArrowRight />
          </Button>
        )}
        {best && (
          <span className="text-sm text-muted-foreground tabular-nums">
            Đúng ngay lần đầu: {best.best}/{best.total}
          </span>
        )}
      </div>
    </div>
  );
}

/** Tap the sentences in the order they should be read; check; on a mistake, the right ones stay and the rest is redone. */
function Ordering({ para, seed, onChecked, onNext }: { para: Paragraph; seed: string; onChecked: (firstTry: boolean, done: boolean) => void; onNext: () => void }) {
  const pool = useMemo(() => shuffleSeeded(para.s.map((_, i) => i), seed), [para, seed]);
  const [picked, setPicked] = useState<number[]>([]);
  const [checks, setChecks] = useState(0);
  const [result, setResult] = useState<boolean[] | null>(null);
  const done = Boolean(result && result.every(Boolean));
  const full = picked.length === para.s.length;

  const check = () => {
    const r = picked.map((s, i) => s === i);
    const ok = r.every(Boolean);
    setResult(r);
    onChecked(checks === 0 && ok, ok);
    setChecks((n) => n + 1);
  };
  const retry = () => {
    // keep the right beginning, give back the rest
    const keep = result ? result.findIndex((x) => !x) : 0;
    setPicked(picked.slice(0, Math.max(0, keep)));
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Bước 1/2 · Xếp câu thành đoạn văn</p>
        <p className="text-sm text-muted-foreground">
          Đề: <span className="text-foreground">{para.prompt}</span> · Bấm lần lượt các câu theo thứ tự đúng.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Đoạn văn của bạn</p>
          {picked.length === 0 && <p className="text-sm text-muted-foreground">Chưa có câu nào — bấm câu đầu tiên ở dưới.</p>}
          <ol className="space-y-1.5">
            {picked.map((s, i) => (
              <li
                key={s}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                  result && (result[i] ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10'),
                )}
              >
                <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
                <span lang="en" className="flex-1">
                  {para.s[s]!.t}
                </span>
                {done && <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold', ROLE_TONE[para.s[s]!.r])}>{ROLE_INFO[para.s[s]!.r].name}</span>}
                {!result && (
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Bỏ câu này" onClick={() => setPicked(picked.filter((x) => x !== s))}>
                    <Undo2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {!result && pool.some((s) => !picked.includes(s)) && (
        <ul className="space-y-1.5" aria-label="Các câu chưa xếp">
          {pool
            .filter((s) => !picked.includes(s))
            .map((s) => (
              <li key={s}>
                <button type="button" onClick={() => setPicked([...picked, s])} className="w-full rounded-lg border bg-card px-3 py-2 text-left text-sm hover:border-primary hover:bg-accent/40" lang="en">
                  {para.s[s]!.t}
                </button>
              </li>
            ))}
        </ul>
      )}

      {result && !done && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          Chưa đúng. Gợi ý: đoạn văn bắt đầu bằng {para.s[0]!.r === 'O' ? 'ý kiến của phía kia (Some people argue / It is often claimed…)' : 'câu chủ đề — ý chung nhất'}, rồi giải thích, ví dụ, và kết đoạn bằng câu nối về đề (Therefore / For this reason…). Từ nối đầu câu là manh mối.
        </p>
      )}
      {done && (
        <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <p className="font-semibold">{checks === 1 ? 'Chính xác ngay lần đầu!' : 'Đúng rồi!'} Vai trò từng câu:</p>
          <ul className="space-y-1">
            {para.s.map((x) => (
              <li key={x.t}>
                <span className={cn('mr-2 rounded px-1.5 py-0.5 text-xs font-semibold', ROLE_TONE[x.r])}>{ROLE_INFO[x.r].name}</span>
                {ROLE_INFO[x.r].tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {!result && (
          <Button onClick={check} disabled={!full}>
            <Check /> Kiểm tra
          </Button>
        )}
        {result && !done && (
          <Button variant="outline" onClick={retry}>
            <RotateCcw /> Xếp lại phần sai
          </Button>
        )}
        {done && (
          <Button onClick={onNext} autoFocus>
            Sang bước 2 <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
