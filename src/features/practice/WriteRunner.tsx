import { ArrowRight, Check, CheckCircle2, Lightbulb, RotateCcw, ThumbsUp, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { DiffView } from '@/features/dictation/DiffView';
import { expandContractions, type Checked } from '@/lib/grammar/drills';
import { checkWrite, usesWord, type WriteItem } from '@/lib/practice/items';
import { cn } from '@/lib/utils';

export interface WriteAnswer {
  typed: string;
  result: Checked;
  /** right on the first try (or accepted by the learner) */
  firstTry: boolean;
}

const norm = (s: string) => expandContractions(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * One sentence at a time: write it in English, check against the accepted answers (contractions, capitals and
 * punctuation don't count), see the difference, retry once. "fix" mode starts from the wrong sentence so it can be edited.
 * The score is the number of sentences right on the first try; "Tôi viết đúng" accepts a different correct wording.
 */
export function WriteRunner({
  items,
  mode,
  heading,
  onFinish,
  summary = true,
}: {
  items: WriteItem[];
  /** translate: Vietnamese → English · fix: correct the wrong sentence · gap: type the right form of the word */
  mode: 'translate' | 'fix' | 'gap';
  heading: ReactNode;
  /** called after a full run (every sentence), with the first-try score */
  onFinish: (score: number, total: number, answers: Record<number, WriteAnswer>) => void;
  /** show the result page at the end (otherwise the parent takes over after onFinish) */
  summary?: boolean;
}) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
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
  const finished = pos >= order.length;
  const passed = result && result.verdict !== 'wrong';
  const full = order.length === items.length;

  useEffect(() => input.current?.focus(), [pos]);
  useEffect(() => {
    if (!finished) return;
    if (full) {
      const score = order.filter((i) => answers[i]?.firstTry).length;
      onFinish(score, order.length, answers);
    }
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
    setTries((n) => n + 1);
  };
  const canAccept = !item?.mustUse || usesWord(typed, item.mustUse);
  const accept = () => {
    if (!result) return;
    setAnswers((a) => ({ ...a, [idx]: { typed, result: { ...result, verdict: 'correct' }, firstTry: tries <= 1 } }));
    next();
  };
  const next = () => {
    const p = pos + 1;
    setPos(p);
    setTyped(start(items[order[p]!]));
    setHint(false);
    setTries(0);
    setResult(null);
    setNote('');
  };
  const restart = (only?: number[]) => {
    const o = only ?? items.map((_, i) => i);
    setOrder(o);
    setAnswers({});
    setPos(0);
    setTyped(start(items[o[0]!]));
    setHint(false);
    setTries(0);
    setResult(null);
    setNote('');
  };

  if (finished) return summary ? <Summary items={items} order={order} answers={answers} onRetry={restart} /> : null;

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
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {mode === 'fix' ? 'Câu có một lỗi — sửa lại cho đúng' : mode === 'gap' ? 'Điền dạng đúng của từ trong ngoặc' : 'Dịch sang tiếng Anh'}
              {item!.label && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 normal-case tracking-normal">{item!.label}</span>}
            </p>
            <p className={cn('mt-1 text-xl font-semibold leading-snug sm:text-2xl', mode === 'fix' && 'decoration-rose-400 decoration-wavy underline-offset-4')} lang={mode === 'translate' ? 'vi' : 'en'} data-testid="prompt">
              {item!.prompt}
            </p>
            {mode === 'translate' && item!.mustUse && (
              <p className="mt-1 text-sm text-muted-foreground">
                Dùng: <b lang="en">{item!.mustUse}</b>
              </p>
            )}
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

function Summary({ items, order, answers, onRetry }: { items: WriteItem[]; order: number[]; answers: Record<number, WriteAnswer>; onRetry: (only?: number[]) => void }) {
  const right = order.filter((i) => answers[i]?.firstTry);
  const wrong = order.filter((i) => !answers[i]?.firstTry);
  const pct = Math.round((right.length / order.length) * 100);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6 text-center">
          <p className="text-5xl" aria-hidden>
            {pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}
          </p>
          <h2 className="text-2xl font-bold">
            {right.length}/{order.length} câu đúng ngay lần đầu
          </h2>
          <p className="text-muted-foreground">{order.length < items.length ? 'Đây là vòng luyện lại — điểm của bài chỉ tính khi làm cả bài.' : pct >= 80 ? 'Đạt yêu cầu hôm nay.' : 'Chưa đạt 80%. Luyện lại câu sai rồi làm lại cả bài.'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {wrong.length > 0 && (
              <Button onClick={() => onRetry(wrong)}>
                <RotateCcw /> Luyện lại {wrong.length} câu sai
              </Button>
            )}
            <Button variant="outline" onClick={() => onRetry()}>
              Làm lại cả bài
            </Button>
          </div>
        </CardContent>
      </Card>
      {wrong.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h3 className="font-semibold">Câu cần xem lại</h3>
            <ul className="divide-y">
              {wrong.map((i) => (
                <li key={i} className="space-y-0.5 py-2.5 text-sm">
                  <p className="font-medium">{items[i]!.prompt}</p>
                  {answers[i] && (
                    <p className="text-muted-foreground" lang="en">
                      Bạn viết: <span className="text-rose-700 dark:text-rose-300">{answers[i]!.typed}</span>
                    </p>
                  )}
                  <p lang="en">
                    Đáp án: <b>{answers[i]?.result.closest ?? items[i]!.en[0]}</b>
                  </p>
                  {items[i]!.why && <p className="text-muted-foreground">💡 {items[i]!.why}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
