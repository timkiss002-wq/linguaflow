import { CheckCircle2, Info, RotateCcw, XCircle } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DAILY_START, TFNG_LABEL, recordAnswer, tfngSet, type TfngStatement } from '@/lib/practice-daily';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { dayByDate, daysBetween, formatDay } from '@/lib/roadmap/plan';
import { cn } from '@/lib/utils';

type Ans = TfngStatement['a'];
const CHOICES: Ans[] = ['T', 'F', 'NG'];
const PASS = 0.5;

/** Shows a passage with the evidence sentences marked once the answers are checked. */
function PassageText({ text, marks }: { text: string; marks: string[] }) {
  if (!marks.length) return <p className="leading-relaxed">{text}</p>;
  const parts: (string | { m: string })[] = [];
  let rest = text;
  for (;;) {
    const hits = marks.map((m) => ({ m, i: rest.indexOf(m) })).filter((h) => h.i >= 0).sort((a, b) => a.i - b.i);
    const h = hits[0];
    if (!h) break;
    parts.push(rest.slice(0, h.i), { m: h.m });
    rest = rest.slice(h.i + h.m.length);
  }
  parts.push(rest);
  return (
    <p className="leading-relaxed">
      {parts.map((p, i) => (typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : <mark key={i} className="rounded bg-warning/25 px-0.5 text-foreground">{p.m}</mark>))}
    </p>
  );
}

/**
 * /tfng/:date — short True / False / Not Given passages. The difference that matters is drilled on every answer:
 * FALSE = the passage says the opposite; NOT GIVEN = the passage does not say it at all.
 */
export default function TfngPage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const taskId = `${date}:reading-tfng`;
  const passages = useMemo(() => (day ? tfngSet(day.phase, Math.max(0, daysBetween(DAILY_START, date))) : []), [day, date]);
  const all = useMemo(() => passages.flatMap((p, pi) => p.q.map((q, qi) => ({ key: `${p.id}:${qi}`, pi, q }))), [passages]);
  const [answers, setAnswers] = useState<Record<string, Ans>>({});
  const [checked, setChecked] = useState(false);
  const [first, setFirst] = useState<Record<string, boolean> | null>(null);
  const [redo, setRedo] = useState<Set<string>>(new Set());

  if (!day) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;

  const active = first ? all.filter((x) => redo.has(x.key)) : all;
  const allAnswered = active.every((x) => answers[x.key]);
  const score = first ? Object.values(first).filter(Boolean).length : 0;
  const wrongNow = all.filter((x) => checked && answers[x.key] !== x.q.a).map((x) => x.key);
  const rateOk = first ? score / all.length >= PASS : false;
  const finished = checked && (first ? rateOk || wrongNow.length === 0 : false);
  const best = practiceOf(taskId);

  const check = () => {
    setChecked(true);
    if (!first) {
      const f: Record<string, boolean> = {};
      for (const x of all) {
        f[x.key] = answers[x.key] === x.q.a;
        recordAnswer(`tfng:${x.key}`, f[x.key]!);
      }
      setFirst(f);
      const s = Object.values(f).filter(Boolean).length;
      const ok = s / all.length >= PASS;
      savePractice(taskId, s, all.length, ok);
    } else if (all.every((x) => answers[x.key] === x.q.a)) {
      savePractice(taskId, score, all.length, true);
    }
  };
  const retry = () => {
    const keys = new Set(wrongNow);
    setRedo(keys);
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !keys.has(k))));
    setChecked(false);
  };

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Reading hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">True / False / Not Given</h1>
        {best && !checked && <p className="text-sm text-muted-foreground tabular-nums">Điểm cao nhất: {best.best}/{best.total}</p>}
      </header>

      <section className="grid gap-3 rounded-xl border bg-card p-4 text-sm sm:grid-cols-3" aria-label="Cách phân biệt">
        <p>
          <b className="text-success">TRUE</b> — bài nói <b>đúng ý</b> câu này (có thể bằng từ đồng nghĩa).
        </p>
        <p>
          <b className="text-destructive">FALSE</b> — bài nói <b>ngược lại</b>: tìm được câu trong bài mâu thuẫn trực tiếp.
        </p>
        <p>
          <b className="text-foreground">NOT GIVEN</b> — bài <b>không nhắc tới</b>, hoặc chỉ nhắc một phần; không có câu nào xác nhận hay phủ nhận.
        </p>
        <p className="flex gap-1.5 text-muted-foreground sm:col-span-3">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Mẹo: trước khi chọn FALSE, hãy chỉ ra được câu trong bài nói ngược lại. Không chỉ ra được → NOT GIVEN. Cẩn thận với từ tuyệt đối (all, never, only, most) và so sánh (more, cheaper) mà bài không nói.
        </p>
      </section>

      {passages.map((p, pi) => {
        const marks = checked ? p.q.map((q) => q.ev).filter((e): e is string => Boolean(e)) : [];
        return (
          <section key={p.id} className="grid gap-4 lg:grid-cols-2" aria-labelledby={`p-${p.id}`}>
            <article className="rounded-xl border bg-card p-5 lg:sticky lg:top-16 lg:self-start" lang="en">
              <h2 id={`p-${p.id}`} className="mb-2 font-semibold">
                {passages.length > 1 && <span className="mr-1.5 text-muted-foreground">Đoạn {pi + 1}.</span>}
                {p.title}
              </h2>
              <PassageText text={p.text} marks={marks} />
            </article>
            <ol className="space-y-3">
              {all
                .filter((x) => x.pi === pi)
                .map((x, qi) => {
                  const a = answers[x.key];
                  const locked = checked || (first !== null && !redo.has(x.key));
                  const right = a === x.q.a;
                  const show = checked || locked;
                  return (
                    <li key={x.key} className={cn('rounded-xl border bg-card p-4', show && (right ? 'border-success/50' : 'border-destructive/50'))} data-statement={x.key}>
                      <p className="font-medium" lang="en">
                        <span className="mr-1.5 text-muted-foreground">{qi + 1}.</span>
                        {x.q.s}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Câu ${qi + 1}`}>
                        {CHOICES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={a === c}
                            disabled={locked}
                            onClick={() => setAnswers((s) => ({ ...s, [x.key]: c }))}
                            className={cn(
                              'min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                              a === c ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50 hover:bg-accent/60',
                              show && c === x.q.a && a !== c && 'border-success text-success',
                            )}
                          >
                            {TFNG_LABEL[c]}
                          </button>
                        ))}
                      </div>
                      {show && (
                        <div className="mt-3 flex gap-2 text-sm" role="status">
                          {right ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />}
                          <div className="space-y-1">
                            <p>
                              <b>Đáp án: {TFNG_LABEL[x.q.a]}.</b> {x.q.w}
                            </p>
                            {x.q.ev && (
                              <p className="text-muted-foreground" lang="en">
                                Căn cứ: “{x.q.ev}”
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
            </ol>
          </section>
        );
      })}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-3 shadow-soft backdrop-blur">
        {!checked && (
          <Button onClick={check} disabled={!allAnswered} data-testid="check-tfng">
            Kiểm tra {active.length} câu
          </Button>
        )}
        {checked && first && (
          <p className="text-sm font-semibold tabular-nums" data-testid="tfng-score">
            Lần đầu đúng {score}/{all.length} ({Math.round((score / all.length) * 100)}%)
          </p>
        )}
        {checked && !finished && (
          <Button onClick={retry}>
            <RotateCcw /> Làm lại {wrongNow.length} câu sai
          </Button>
        )}
        {finished && (
          <>
            <span className="text-sm text-success">Đạt — đã xong bài hôm nay.</span>
            <Button asChild variant="outline">
              <Link to="/dashboard">Về Hôm nay</Link>
            </Button>
          </>
        )}
        {!checked && !allAnswered && <span className="text-xs text-muted-foreground">Chọn đáp án cho mọi câu rồi bấm Kiểm tra.</span>}
      </div>
    </div>
  );
}
