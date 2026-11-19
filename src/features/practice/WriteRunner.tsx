import { ArrowRight, Check, CheckCircle2, Lightbulb, RotateCcw, ThumbsUp, X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { DiffView } from '@/features/dictation/DiffView';
import { expandContractions, type Checked } from '@/lib/grammar/drills';
import { checkWrite, usesWord, type WriteItem } from '@/lib/practice/items';
import { PASS_RATE, emptyRun, firstRoundDone, firstScore, loadRun, record, runPassed, saveRun, stillWrong, toRedo, type RunState } from '@/lib/practice/retry';
import { diagnose, type Finding } from '@/lib/diagnose';
import { TAGS } from '@/lib/translate-daily';
import { cn } from '@/lib/utils';

export interface WriteAnswer {
  typed: string;
  result: Checked;
  /** right on the first try (or accepted by the learner) */
  firstTry: boolean;
}

export interface RoundResult {
  /** first-try score of the graded sentences of the first round */
  score: number;
  total: number;
  /** ≥ 50 % first try, or every required sentence redone */
  passed: boolean;
}

/** "[part]" in a prompt is the part to ask about (daily question forming): shown highlighted, without the brackets. */
const MARKED = /\[[^\]]+\]/;
function Marked({ text }: { text: string }) {
  if (!MARKED.test(text)) return <>{text}</>;
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((p, i) =>
        p.startsWith('[') && p.endsWith(']') ? (
          <mark key={i} className="rounded bg-amber-200/70 px-1 text-foreground underline decoration-amber-500 decoration-2 underline-offset-4 dark:bg-amber-500/30">
            {p.slice(1, -1)}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const norm = (s: string) => expandContractions(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * One sentence at a time: write it in English, check against the accepted answers (contractions, capitals and
 * punctuation don't count), see the difference, retry once. "fix" mode starts from the wrong sentence so it can be edited.
 * Scoring follows the shared rule (lib/practice/retry): graded sentences count on the first try (≥ 50 % to pass), and
 * after the first round only the sentences that still have to be redone come back — never the whole exercise.
 * "Tôi viết đúng" accepts a different correct wording. With `storageKey` the run survives leaving the page.
 * `rounds={false}`: a single pass over the items, no redo (the parent handles it).
 */
export function WriteRunner({
  items,
  mode,
  heading,
  onFinish,
  summary = true,
  storageKey,
  rounds = true,
  extra,
  onFirstTry,
}: {
  items: WriteItem[];
  /** translate: Vietnamese → English · fix: correct the wrong sentence · gap: type the right form of the word */
  mode: 'translate' | 'fix' | 'gap';
  heading: ReactNode;
  /** called at the end of every round (first round and redo rounds) */
  onFinish: (score: number, total: number, answers: Record<number, WriteAnswer>, passed: boolean) => void;
  /** show the result page once passed (otherwise the parent takes over after onFinish) */
  summary?: boolean;
  storageKey?: string;
  rounds?: boolean;
  /** more buttons on the result page */
  extra?: ReactNode;
  /**
   * The first try of each sentence of the first round, once it is settled: right (or accepted with "Tôi viết đúng")
   * or wrong (reported when the learner moves on, so an accepted wording is not counted as a mistake).
   */
  onFirstTry?: (item: WriteItem, typed: string, result: Checked, ok: boolean) => void;
}) {
  const [run, setRun] = useState<RunState>(() => (storageKey && rounds ? loadRun(storageKey, items) : emptyRun()));
  const keyIdx = (keys: string[]) => items.map((it, i) => (keys.includes(it.key) ? i : -1)).filter((i) => i >= 0);
  const [firstRound, setFirstRound] = useState(() => !firstRoundDone(items, run));
  const [order, setOrder] = useState(() => (firstRoundDone(items, run) ? [] : items.map((_, i) => i).filter((i) => !(items[i]!.key in run.first))));
  const [pos, setPos] = useState(0);
  const idx = order[pos]!;
  const item = items[idx];
  const start = (it?: WriteItem) => (mode === 'fix' && it ? it.prompt : '');
  const [typed, setTyped] = useState(() => start(item));
  const [hint, setHint] = useState(false);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<Checked | null>(null);
  const [note, setNote] = useState('');
  const [answers, setAnswers] = useState<Record<number, WriteAnswer>>({});
  const input = useRef<HTMLTextAreaElement>(null);
  const firstWrong = useRef<{ typed: string; result: Checked } | null>(null);
  const finished = pos >= order.length;
  const passed = result && result.verdict !== 'wrong';
  const done = runPassed(items, run);

  const update = (st: RunState) => {
    setRun(st);
    if (storageKey && rounds) saveRun(storageKey, st);
  };

  useEffect(() => input.current?.focus(), [pos]);
  useEffect(() => {
    if (!finished || !order.length) return;
    if (!rounds) {
      const score = order.filter((i) => answers[i]?.firstTry).length;
      onFinish(score, order.length, answers, score / order.length >= PASS_RATE);
      return;
    }
    const { score, total } = firstScore(items, run);
    onFinish(score, total, answers, runPassed(items, run));
    // run once when the round ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const check = () => {
    if (!typed.trim() || !item) return;
    if (mode === 'fix' && norm(typed) === norm(item.prompt)) {
      setNote('Câu này vẫn còn lỗi — bạn chưa sửa gì.');
      return;
    }
    const r = checkWrite(item, typed, mode !== 'translate');
    setResult(r);
    setNote(r.verdict === 'wrong' && item.mustUse && !usesWord(typed, item.mustUse) ? `Câu của bạn chưa dùng “${item.mustUse}”.` : '');
    const ok = r.verdict !== 'wrong';
    setAnswers((a) => ({ ...a, [idx]: { typed, result: r, firstTry: ok && tries === 0 } }));
    // graded sentences count on their first try only; ungraded ones as soon as they are right
    if (item.graded === false || tries === 0) update(record(run, item, firstRound, ok && tries === 0, ok));
    if (tries === 0 && firstRound) {
      if (ok) onFirstTry?.(item, typed, r, true);
      else firstWrong.current = { typed, result: r };
    }
    setTries((n) => n + 1);
  };
  const canAccept = !item?.mustUse || usesWord(typed, item.mustUse);
  const accept = () => {
    if (!result || !item) return;
    setAnswers((a) => ({ ...a, [idx]: { typed, result: { ...result, verdict: 'correct' }, firstTry: tries <= 1 } }));
    update(record(run, item, firstRound, tries <= 1, true));
    if (tries <= 1 && firstWrong.current) {
      onFirstTry?.(item, firstWrong.current.typed, firstWrong.current.result, true);
      firstWrong.current = null;
    }
    next();
  };
  const next = () => {
    if (firstWrong.current && item) onFirstTry?.(item, firstWrong.current.typed, firstWrong.current.result, false);
    firstWrong.current = null;
    const p = pos + 1;
    setPos(p);
    setTyped(start(items[order[p]!]));
    setHint(false);
    setTries(0);
    setResult(null);
    setNote('');
  };
  const begin = (o: number[], first: boolean, st = run) => {
    if (st !== run) update(st);
    setFirstRound(first);
    setOrder(o);
    setAnswers({});
    setPos(0);
    setTyped(start(items[o[0]!]));
    setHint(false);
    setTries(0);
    setResult(null);
    setNote('');
  };
  const redo = toRedo(items, run);
  const optional = stillWrong(items, run);

  if (finished) {
    if (!rounds || (done && !summary)) return null;
    return (
      <Summary
        items={items}
        run={run}
        redo={redo}
        optional={optional}
        answers={answers}
        order={order}
        onRedo={(keys) => begin(keyIdx(keys), false)}
        onRestart={() => begin(items.map((_, i) => i), true, emptyRun())}
        extra={extra}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{heading}</span>
          <span className="tabular-nums">
            Câu {pos + 1}/{order.length}
          </span>
        </div>
        <Progress value={(pos / order.length) * 100} className="h-1.5" label="Tiến độ" />
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className={cn(item!.scene && 'flex items-center gap-4')}>
            {item!.scene && (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 text-4xl leading-none ring-1 ring-border dark:from-sky-500/10 dark:to-teal-500/10" aria-hidden>
                <span className="text-center [word-break:keep-all]">{item!.scene}</span>
              </div>
            )}
            <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item!.task ?? (mode === 'fix' ? 'Câu có một lỗi — sửa lại cho đúng' : mode === 'gap' ? 'Điền dạng đúng của từ trong ngoặc' : 'Dịch sang tiếng Anh')}
              {item!.label && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 normal-case tracking-normal">{item!.label}</span>}
            </p>
            <p className={cn('mt-1 text-xl font-semibold leading-snug sm:text-2xl', mode === 'fix' && 'decoration-rose-400 decoration-wavy underline-offset-4')} lang={mode === 'translate' && !MARKED.test(item!.prompt) ? 'vi' : 'en'} data-testid="prompt">
              <Marked text={item!.prompt} />
            </p>
            {!firstRound && <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Làm lại câu sai</p>}
            {mode === 'translate' && item!.mustUse && (
              <p className="mt-1 text-sm text-muted-foreground">
                Dùng: <b lang="en">{item!.mustUse}</b>
              </p>
            )}
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              ref={input}
              lang="en"
              rows={mode === 'gap' ? 1 : 2}
              value={typed}
              disabled={Boolean(passed)}
              onChange={(e) => {
                setTyped(e.target.value);
                setNote('');
                if (result && !passed) setResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return;
                e.preventDefault();
                if (passed) next();
                else check();
              }}
              placeholder={mode === 'gap' ? 'Gõ từ cần điền… (Enter để kiểm tra)' : 'Gõ câu tiếng Anh… (Enter để kiểm tra)'}
              className="text-lg"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Câu của bạn"
            />
            {hint && item!.hint ? (
              <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <Lightbulb className="size-4 shrink-0" aria-hidden /> Gợi ý: <span>{item!.hint}</span>
              </p>
            ) : (
              !passed &&
              item!.hint && (
                <button type="button" onClick={() => setHint(true)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Lightbulb className="size-4" aria-hidden /> Xem gợi ý
                </button>
              )
            )}
            {note && <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{note}</p>}
          </div>

          {result && <Feedback result={result} item={item!} />}

          <div className="flex flex-wrap justify-end gap-2">
            {!result && (
              <Button onClick={check} disabled={!typed.trim()}>
                <Check /> Kiểm tra
              </Button>
            )}
            {result && result.verdict === 'wrong' && (
              <>
                {mode !== 'gap' && (
                  <Button variant="ghost" onClick={accept} disabled={!canAccept} title={canAccept ? 'Câu của bạn đúng ngữ pháp và nghĩa nhưng diễn đạt khác đáp án' : `Cần dùng “${item!.mustUse}”`}>
                    <ThumbsUp /> Tôi viết đúng
                  </Button>
                )}
                {tries < 2 && (
                  <Button variant="outline" onClick={() => (setResult(null), input.current?.focus())}>
                    <RotateCcw /> Sửa lại
                  </Button>
                )}
                <Button onClick={next}>
                  Câu tiếp <ArrowRight />
                </Button>
              </>
            )}
            {passed && (
              <Button onClick={next} autoFocus>
                {pos + 1 < order.length ? 'Câu tiếp' : 'Xem kết quả'} <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Feedback({ result, item }: { result: Checked; item: WriteItem }) {
  const others = item.en.filter((a) => a !== result.closest).slice(0, 3);
  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border p-4',
        result.verdict === 'correct' ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : result.verdict === 'spelling' ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10',
      )}
      role="status"
      data-verdict={result.verdict}
    >
      <p className="flex items-center gap-1.5 font-semibold">
        {result.verdict === 'correct' ? (
          <>
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden /> Chính xác!
          </>
        ) : result.verdict === 'spelling' ? (
          <>
            <CheckCircle2 className="size-5 text-amber-600" aria-hidden /> Đúng — chỉ sai chính tả
          </>
        ) : (
          <>
            <X className="size-5 text-rose-600" aria-hidden /> Chưa đúng — so với đáp án gần nhất:
          </>
        )}
      </p>
      {result.verdict !== 'correct' && <DiffView result={result.diff} language="en" reveal />}
      <p className="text-sm" lang="en">
        <span className="text-muted-foreground">Đáp án: </span>
        <b>{result.closest}</b>
      </p>
      {result.verdict === 'wrong' && item.diagnose && <Diagnosis findings={diagnose(result.diff.tokens, item.diagnose)} />}
      {item.why && <p className="text-sm">💡 {item.why}</p>}
      {others.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Cách viết khác cũng đúng ({others.length})</summary>
          <ul className="mt-1 list-disc pl-5" lang="en">
            {others.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** "Bạn sai ở đâu": one line per mistake, with a link to review its grammar point. */
function Diagnosis({ findings }: { findings: Finding[] }) {
  const inRouter = useInRouterContext();
  if (!findings.length) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-white/70 p-3 text-sm dark:border-rose-500/30 dark:bg-transparent" data-testid="diagnosis">
      <p className="font-semibold">Bạn sai ở đâu</p>
      <ul className="mt-1 space-y-1">
        {findings.map((f) => (
          <li key={f.text} className="flex flex-wrap items-baseline gap-x-2">
            {f.tag && TAGS[f.tag] ? (
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">{TAGS[f.tag]!.name}</span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">Từ vựng</span>
            )}
            <span>{f.text}</span>
            {f.tag && TAGS[f.tag] && inRouter && (
              <Link to={`/on-ngu-phap/${f.tag}`} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                Ôn lại →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({
  items,
  run,
  redo,
  optional,
  answers,
  order,
  onRedo,
  onRestart,
  extra,
}: {
  items: WriteItem[];
  run: RunState;
  redo: string[];
  optional: string[];
  answers: Record<number, WriteAnswer>;
  order: number[];
  onRedo: (keys: string[]) => void;
  onRestart: () => void;
  extra?: ReactNode;
}) {
  const { score, total } = firstScore(items, run);
  const passed = redo.length === 0;
  const ungraded = items.filter((i) => i.graded === false);
  const ungradedOk = ungraded.filter((i) => run.first[i.key] || run.fixed.includes(i.key)).length;
  const pct = total ? Math.round((score / total) * 100) : 100;
  const rateOk = pct >= PASS_RATE * 100;
  const list = (passed ? optional : redo).map((k) => items.findIndex((i) => i.key === k)).filter((i) => i >= 0);
  const inRouter = useInRouterContext();
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6 text-center">
          <p className="text-5xl" aria-hidden>
            {passed ? '🏆' : pct >= 60 ? '👍' : '💪'}
          </p>
          {total > 0 && (
            <h2 className="text-2xl font-bold">
              {score}/{total} câu{ungraded.length ? ' chủ động' : ''} đúng ngay lần đầu
            </h2>
          )}
          {ungraded.length > 0 && (
            <p className={cn('font-medium', total ? 'text-sm text-muted-foreground' : 'text-2xl font-bold text-foreground')}>
              {ungradedOk}/{ungraded.length} câu từ thụ động đã đúng
            </p>
          )}
          <p className="text-muted-foreground" data-testid="run-status">
            {passed
              ? 'Đạt yêu cầu — đã xong bài này.'
              : rateOk
                ? `Phần chủ động đã đạt. Còn ${redo.length} câu từ thụ động — chỉ cần làm lại cho đúng (bao nhiêu lần cũng được).`
                : `Chưa đạt 50% ngay lần đầu. Chỉ cần làm lại ${redo.length} câu sai — câu nào đúng ngay lần làm lại là qua.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!passed && (
              <Button onClick={() => onRedo(redo)} autoFocus>
                <RotateCcw /> Làm lại {redo.length} câu sai
              </Button>
            )}
            {passed && inRouter && (
              <Button asChild autoFocus data-testid="next-after-pass">
                <Link to="/dashboard">
                  Sang việc tiếp theo <ArrowRight />
                </Link>
              </Button>
            )}
            {passed && optional.length > 0 && (
              <Button variant="outline" onClick={() => onRedo(optional)}>
                <RotateCcw /> Luyện thêm {optional.length} câu sai (không bắt buộc)
              </Button>
            )}
            {passed && (
              <Button variant="ghost" onClick={onRestart}>
                Làm lại cả bài
              </Button>
            )}
            {extra}
          </div>
        </CardContent>
      </Card>
      {list.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h3 className="font-semibold">{passed ? 'Câu sai lần đầu' : 'Câu phải làm lại'}</h3>
            <ul className="divide-y">
              {list.map((i) => {
                const a = order.includes(i) ? answers[i] : undefined;
                return (
                  <li key={i} className="space-y-0.5 py-2.5 text-sm">
                    <p className="font-medium">
                      {items[i]!.label && <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-normal">{items[i]!.label}</span>}
                      <Marked text={items[i]!.prompt} />
                    </p>
                    {a && (
                      <p className="text-muted-foreground" lang="en">
                        Bạn viết: <span className="text-rose-700 dark:text-rose-300">{a.typed}</span>
                      </p>
                    )}
                    <p lang="en">
                      Đáp án: <b>{a?.result.closest ?? items[i]!.en[0]}</b>
                    </p>
                    {items[i]!.why && <p className="text-muted-foreground">💡 {items[i]!.why}</p>}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
