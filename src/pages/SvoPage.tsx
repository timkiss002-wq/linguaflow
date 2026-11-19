import { ArrowLeft, ArrowRight, Check, ChevronDown, RotateCcw, Undo2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeShell } from '@/features/practice/PracticeShell';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { ROLES, ROLE_INFO, SVO, orderOk, shuffled, svoLevel, svoSet, svoWriteItem, type Chunk, type Role, type SvoSentence } from '@/lib/practice/items';
import { emptyRun, firstScore, record, runPassed, toRedo, type RunState } from '@/lib/practice/retry';
import { cn } from '@/lib/utils';

const ROLE_STYLE: Record<Role, string> = {
  S: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200',
  V: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
  O: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
  C: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200',
  A: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
};
const LEVEL = ['', 'Câu đơn: S + V, S + V + O, S + V + C', 'Thêm trạng ngữ, hai tân ngữ, tân ngữ + bổ ngữ', 'Động từ nhiều chữ: hoàn thành, bị động, khuyết thiếu', 'Chủ ngữ / tân ngữ dài: mệnh đề, cụm V-ing'];

/**
 * /cau-svo/:date — the S-V-O task of a day: (1) label the parts of 6 sentences, (2) put 3 shuffled sentences back in
 * order, (3) write 3 sentences from Vietnamese. Parts 2–3 reuse the previous set, so yesterday's sentences come back.
 * /cau-svo — the lesson and free practice of any set (?set=n).
 */
export default function SvoPage() {
  const { date } = useParams();
  const [params, setParams] = useSearchParams();
  if (!date) {
    const n = Math.min(SVO.sets.length - 1, Math.max(0, Number(params.get('set') ?? 0) || 0));
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/grammar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> Ngữ pháp
        </Link>
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Cấu trúc câu S-V-O</h1>
          <p className="mt-1 text-sm text-muted-foreground">Nền của mọi câu đúng trong Writing: tìm chủ ngữ, động từ, tân ngữ — rồi viết theo đúng trật tự đó.</p>
        </header>
        <Lesson open />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Luyện bộ:</span>
          {SVO.sets.map((_, i) => (
            <button key={i} type="button" onClick={() => setParams({ set: String(i) })} className={cn('size-8 rounded-md border tabular-nums', i === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              {i + 1}
            </button>
          ))}
        </div>
        <Practice key={n} today={svoSet(n)} prev={svoSet(n)} level={svoLevel(n)} onFinish={() => undefined} />
      </div>
    );
  }
  return (
    <PracticeShell
      date={date}
      kind="grammar-svo"
      title="Câu chuẩn S-V-O"
      intro="Phần 1: gán nhãn 6 câu · Phần 2: xếp lại 3 câu · Phần 3: viết 3 câu từ tiếng Việt. Tính chung cả 3 phần, cần đúng ngay lần đầu ít nhất 50%; chưa đạt thì chỉ làm lại những câu sai."
      empty="Bài S-V-O có vào thứ Hai – thứ Bảy của giai đoạn Nền tảng và thứ Hai, Tư, Sáu của giai đoạn Luyện tập."
    >
      {({ task, save }) => (
        <>
          <Lesson />
          <Practice key={date} today={svoSet(task.svo!.set)} prev={svoSet(task.svo!.prev)} level={svoLevel(task.svo!.set)} onFinish={save} />
        </>
      )}
    </PracticeShell>
  );
}

function Lesson({ open: initial = false }: { open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <Card>
      <CardContent className="pt-5">
        <button type="button" className="flex w-full items-center justify-between gap-2 text-left font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Lý thuyết: 5 thành phần và 6 mẫu câu
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <div className="mt-4 space-y-5">
            <ul className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <li key={r} className={cn('rounded-lg border px-3 py-2 text-sm', ROLE_STYLE[r])}>
                  <b>
                    {r} · {ROLE_INFO[r].name}
                  </b>{' '}
                  <span className="opacity-75">({ROLE_INFO[r].en})</span>
                  <br />
                  {ROLE_INFO[r].q}
                </li>
              ))}
            </ul>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Mẫu câu</h3>
              <ul className="space-y-2">
                {SVO.patterns.map((p) => (
                  <li key={p.id} className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="font-mono font-semibold">{p.formula}</span> — <span lang="en">{p.en}</span>
                    <br />
                    <span className="text-muted-foreground">{p.vi}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Quy tắc viết một câu chuẩn</h3>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                {SVO.rules_vi.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Practice({ today, prev, level, onFinish }: { today: SvoSentence[]; prev: SvoSentence[]; level: number; onFinish: (score: number, total: number, answers?: unknown, passed?: boolean) => void }) {
  const arrangeAll = prev.slice(0, 3);
  const writeAll = useMemo(() => prev.slice(3, 6).map(svoWriteItem), [prev]);
  // one key per sentence of each part; the shared rule decides what has to be redone
  const keys = useMemo(() => [...today.map((x) => ({ key: `l:${x.key}` })), ...arrangeAll.map((x) => ({ key: `a:${x.key}` })), ...writeAll.map((x) => ({ key: x.key }))], [today, arrangeAll, writeAll]);
  const [run, setRun] = useState<RunState>(emptyRun);
  const [round, setRound] = useState<string[] | null>(null); // null: first round (every sentence)
  const [part, setPart] = useState<1 | 2 | 3 | 4>(1);
  const inRound = (k: string) => !round || round.includes(k);
  const label = today.filter((x) => inRound(`l:${x.key}`));
  const arrange = arrangeAll.filter((x) => inRound(`a:${x.key}`));
  const write = writeAll.filter((x) => inRound(x.key));
  const nextPart = (from: 1 | 2 | 3) => {
    const order: [1 | 2 | 3, number][] = [
      [1, label.length],
      [2, arrange.length],
      [3, write.length],
    ];
    const n = order.find(([p, len]) => p > from && len > 0);
    return n ? n[0] : 4;
  };
  const add = (results: Record<string, boolean>, st = run) => {
    let next = st;
    for (const [k, ok] of Object.entries(results)) next = record(next, { key: k }, !round, ok, ok);
    setRun(next);
    return next;
  };
  const finish = (st: RunState) => {
    const { score, total } = firstScore(keys, st);
    onFinish(score, total, undefined, runPassed(keys, st));
    setPart(4);
  };
  const begin = (only: string[] | null) => {
    if (!only) setRun(emptyRun());
    setRound(only);
    const has = (pre: string, xs: { key: string }[]) => !only || xs.some((x) => only.includes(pre + x.key));
    setPart(has('l:', today) ? 1 : has('a:', arrangeAll) ? 2 : 3);
  };
  const { score, total } = firstScore(keys, run);
  const redo = toRedo(keys, run);
  const passed = runPassed(keys, run);
  const partScore = (pre: string, xs: { key: string }[]) => `${xs.filter((x) => run.first[pre + x.key]).length}/${xs.length}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mức {level}: {LEVEL[level]}
        {round && <span className="ml-2 font-medium text-amber-700 dark:text-amber-300">· Làm lại {round.length} câu sai</span>}
      </p>
      <ol className="flex gap-2 text-sm" aria-label="Các phần">
        {['Gán nhãn', 'Xếp câu', 'Viết câu', 'Kết quả'].map((t, i) => (
          <li key={t} className={cn('rounded-full px-3 py-1', part === i + 1 ? 'bg-primary text-primary-foreground' : part > i + 1 ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
            {i + 1}. {t}
          </li>
        ))}
      </ol>
      {part === 1 && (
        <Label
          key={`l${round?.join() ?? ''}`}
          items={label}
          onDone={(r) => {
            const st = add(Object.fromEntries(Object.entries(r).map(([k, v]) => [`l:${k}`, v])));
            const n = nextPart(1);
            if (n === 4) finish(st);
            else setPart(n);
          }}
        />
      )}
      {part === 2 && (
        <Arrange
          key={`a${round?.join() ?? ''}`}
          items={arrange}
          onDone={(r) => {
            const st = add(Object.fromEntries(Object.entries(r).map(([k, v]) => [`a:${k}`, v])));
            const n = nextPart(2);
            if (n === 4) finish(st);
            else setPart(n);
          }}
        />
      )}
      {part === 3 && (
        <WriteRunner
          key={`w${round?.join() ?? ''}`}
          items={write}
          mode="translate"
          heading="Phần 3 · viết câu theo trật tự S-V-O"
          summary={false}
          rounds={false}
          onFinish={(_n, _t, answers) => finish(add(Object.fromEntries(write.map((x, i) => [x.key, Boolean(answers[i]?.firstTry)]))))}
        />
      )}
      {part === 4 && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-center">
            <p className="text-5xl" aria-hidden>
              {passed ? '🏆' : '💪'}
            </p>
            <h2 className="text-2xl font-bold">
              {score}/{total} đúng ngay lần đầu
            </h2>
            <p className="text-sm text-muted-foreground">
              Gán nhãn {partScore('l:', today)} · Xếp câu {partScore('a:', arrangeAll)} · Viết câu {partScore('', writeAll)}
            </p>
            <p className="text-muted-foreground">
              {passed ? 'Đạt yêu cầu hôm nay.' : `Chưa đạt 50% ngay lần đầu. Chỉ cần làm lại ${redo.length} câu sai — câu nào đúng ngay lần làm lại là qua.`}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {!passed && (
                <Button onClick={() => begin(redo)}>
                  <RotateCcw /> Làm lại {redo.length} câu sai
                </Button>
              )}
              {passed && (
                <Button variant="outline" onClick={() => begin(null)}>
                  <RotateCcw /> Làm lại cả bài
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Part 1: pick S / V / O / C / A under every chunk; marked together. A sentence counts when every chunk is right. */
function Label({ items, onDone }: { items: SvoSentence[]; onDone: (results: Record<string, boolean>) => void }) {
  const [picked, setPicked] = useState<Record<string, Role>>({});
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const keyOf = (s: SvoSentence, j: number) => `${s.key}:${j}`;
  const right = items.filter((s) => s.chunks.every((c, j) => picked[keyOf(s, j)] === c.role)).length;
  const check = () => {
    const missing = items.findIndex((s) => s.chunks.some((_, j) => !picked[keyOf(s, j)]));
    if (missing >= 0) return setError(`Câu ${missing + 1} còn khối chưa gán nhãn.`);
    setChecked(true);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <b>Phần 1 · Gán nhãn.</b> Câu đã chia sẵn thành khối. Chọn vai trò của từng khối. Mẹo: tìm <b>động từ</b> trước, rồi hỏi “ai / cái gì?” trước nó (S) và “cái gì?” sau nó (O
        hoặc C).
      </p>
      {items.map((s, i) => (
        <Card key={s.key}>
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm text-muted-foreground">
              {i + 1}. {s.vi}
            </p>
            <div className="flex flex-wrap gap-2" lang="en">
              {s.chunks.map((c, j) => {
                const p = picked[keyOf(s, j)];
                const ok = checked && p === c.role;
                return (
                  <div key={j} className={cn('rounded-lg border p-2', checked ? (ok ? 'border-emerald-400' : 'border-rose-400 bg-rose-50/60 dark:bg-rose-500/5') : p ? ROLE_STYLE[p] : 'bg-card')}>
                    <p className="text-[15px] font-medium">
                      {c.text}
                      {c.after}
                    </p>
                    <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label={`Vai trò của “${c.text}”`}>
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={p === r}
                          disabled={checked}
                          title={ROLE_INFO[r].name}
                          onClick={() => {
                            setPicked((x) => ({ ...x, [keyOf(s, j)]: r }));
                            setError('');
                          }}
                          className={cn('size-7 rounded border text-xs font-bold', p === r ? ROLE_STYLE[r] : 'text-muted-foreground hover:bg-muted', checked && r === c.role && 'ring-2 ring-emerald-500')}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {checked && !ok && (
                      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                        Là {c.role} · {ROLE_INFO[c.role].name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!checked ? (
          <Button size="lg" onClick={check}>
            <Check /> Chấm phần 1
          </Button>
        ) : (
          <>
            <p className="font-semibold">
              {right}/{items.length} câu đúng hết các khối
            </p>
            <Button size="lg" onClick={() => onDone(Object.fromEntries(items.map((x) => [x.key, x.chunks.every((c, j) => picked[keyOf(x, j)] === c.role)])))}>
              Tiếp tục <ArrowRight />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const KEEP_CAPITAL = /^(I|English|Hanoi|Japan|Korea|Iceland|Vietnam|Ho Chi Minh|Asia|Australia)\b/;
const tile = (c: Chunk) => (KEEP_CAPITAL.test(c.text) ? c.text : c.text[0]!.toLowerCase() + c.text.slice(1));

/** Part 2: tap the shuffled chunks in order. One retry per sentence; only the first try counts. */
function Arrange({ items, onDone }: { items: SvoSentence[]; onDone: (results: Record<string, boolean>) => void }) {
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState<Record<string, boolean>>({});
  const [answer, setAnswer] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [tries, setTries] = useState(0);
  const s = items[pos]!;
  const pool = useMemo(() => shuffled(s.chunks.map((_, i) => i), s.key), [s]);
  const check = () => {
    const ok = orderOk(
      s.chunks,
      answer.map((i) => s.chunks[i]!),
    );
    setResult(ok);
    if (tries === 0) setScore((r) => ({ ...r, [s.key]: ok }));
    setTries((n) => n + 1);
  };
  const next = () => {
    if (pos + 1 >= items.length) return onDone(score);
    setPos(pos + 1);
    setAnswer([]);
    setResult(null);
    setTries(0);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <b>Phần 2 · Xếp câu ({pos + 1}/{items.length}).</b> Bấm các khối theo đúng thứ tự để thành câu chuẩn. Trạng ngữ (A) có thể đứng đầu hoặc cuối câu.
      </p>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <p className="text-muted-foreground">{s.vi}</p>
          <div className="min-h-14 rounded-lg border-2 border-dashed p-2" aria-label="Câu của bạn" lang="en">
            <div className="flex flex-wrap gap-2">
              {answer.map((i, k) => (
                <button key={i} type="button" disabled={result === true} onClick={() => (setAnswer((a) => a.filter((_, x) => x !== k)), setResult(null))} className="rounded-lg border bg-primary/10 px-3 py-1.5 text-[15px] font-medium">
                  {tile(s.chunks[i]!)}
                </button>
              ))}
              {!answer.length && <span className="px-1 py-1.5 text-sm text-muted-foreground">Bấm khối bên dưới…</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2" lang="en">
            {pool
              .filter((i) => !answer.includes(i))
              .map((i) => (
                <button key={i} type="button" onClick={() => (setAnswer((a) => [...a, i]), setResult(null))} className="rounded-lg border bg-card px-3 py-1.5 text-[15px] font-medium hover:bg-muted">
                  {tile(s.chunks[i]!)}
                </button>
              ))}
          </div>
          {result !== null && (
            <div className={cn('rounded-lg border p-3 text-sm', result ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10' : 'border-rose-300 bg-rose-50 dark:bg-rose-500/10')} role="status">
              <p className="flex items-center gap-1.5 font-semibold">{result ? <Check className="size-4" /> : <X className="size-4" />} {result ? 'Đúng trật tự!' : 'Chưa đúng trật tự.'}</p>
              {(result || tries >= 2) && (
                <p className="mt-1" lang="en">
                  {s.chunks.map((c, j) => (
                    <span key={j} className={cn('mr-1 inline-block rounded border px-1.5', ROLE_STYLE[c.role])}>
                      <sup className="mr-0.5 font-bold">{c.role}</sup>
                      {c.text}
                      {c.after}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {answer.length > 0 && result !== true && (
              <Button variant="ghost" onClick={() => (setAnswer([]), setResult(null))}>
                <Undo2 /> Xếp lại
              </Button>
            )}
            {result === null && (
              <Button onClick={check} disabled={answer.length !== s.chunks.length}>
                <Check /> Kiểm tra
              </Button>
            )}
            {(result === true || (result === false && tries >= 2)) && (
              <Button onClick={next}>
                {pos + 1 < items.length ? 'Câu tiếp' : 'Tiếp tục'} <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
