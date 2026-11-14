import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Lightbulb, RotateCcw, ThumbsUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { DiffView } from '@/features/dictation/DiffView';
import { GrammarDiagram } from '@/features/grammar/GrammarDiagram';
import { PASS, TOPICS, checkTranslation, readQuiz, saveProgress, saveQuiz, topicById, type Checked, type GrammarTopic } from '@/lib/grammar/drills';
import { cn } from '@/lib/utils';

/**
 * /grammar/:topicId — three steps: the lesson (picture, formula, examples, tips), a short recognition quiz,
 * then 8 sentences to translate. ?step=quiz or ?step=drill opens a step directly (links from the learning path).
 */
export default function GrammarDrillPage() {
  const { topicId = '' } = useParams();
  const topic = topicById(topicId);
  const [params] = useSearchParams();
  const asked = params.get('step');
  const [stage, setStage] = useState<'learn' | 'quiz' | 'drill'>(asked === 'drill' ? 'drill' : asked === 'quiz' ? 'quiz' : 'learn');
  if (!topic)
    return (
      <EmptyState
        icon={BookOpen}
        title="Không tìm thấy chủ điểm"
        action={
          <Button asChild variant="outline">
            <Link to="/grammar">Tất cả chủ điểm</Link>
          </Button>
        }
      />
    );
  if (stage === 'learn') return <Lesson topic={topic} onStart={() => setStage(topic.quiz?.length ? 'quiz' : 'drill')} />;
  if (stage === 'quiz' && topic.quiz?.length) return <Quiz key={topic.id} topic={topic} onLearn={() => setStage('learn')} onNext={() => setStage('drill')} />;
  return <Drill key={topic.id} topic={topic} />;
}

function Lesson({ topic, onStart }: { topic: GrammarTopic; onStart: () => void }) {
  return (
    <div className="space-y-5">
      <Back />
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
          Band {topic.band} · {topic.title_en}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{topic.title_vi}</h1>
        <p className="mt-1 text-muted-foreground">{topic.summary_vi}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="pt-5">
            <GrammarDiagram kind={topic.diagram} className="mx-auto max-w-md" />
          </CardContent>
        </Card>
        <Formula topic={topic} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="font-semibold">Ví dụ</h2>
            {topic.examples.map((e) => (
              <div key={e.en}>
                <p className="font-medium" lang="en">
                  {e.en}
                </p>
                <p className="text-sm text-muted-foreground">{e.vi}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-5">
            <h2 className="flex items-center gap-1.5 font-semibold">
              <Lightbulb className="size-4 text-amber-500" aria-hidden /> Lưu ý — lỗi hay gặp
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {topic.tips_vi.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button size="lg" onClick={onStart} data-start>
          {topic.quiz?.length ? `Bước 2: ${topic.quiz.length} câu nhận diện` : `Bắt đầu dịch ${topic.items.length} câu`} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

/** Step 2: pick the right form among four, all questions on one page, marked together with a reason for each. */
function Quiz({ topic, onLearn, onNext }: { topic: GrammarTopic; onLearn: () => void; onNext: () => void }) {
  const items = topic.quiz!;
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const right = items.filter((q, i) => picked[i] === q.answer).length;
  const pass = right / items.length >= PASS;
  const best = readQuiz()[topic.id];
  const check = () => {
    const missing = items.findIndex((_, i) => picked[i] === undefined);
    if (missing >= 0) {
      setError(`Còn câu ${missing + 1} chưa chọn.`);
      return;
    }
    setChecked(true);
    saveQuiz(topic.id, right, items.length);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Back />
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Bước 2 · nhận diện · cần đúng ít nhất {Math.ceil(items.length * PASS)}/{items.length}</p>
        <h1 className="text-2xl font-bold tracking-tight">{topic.title_vi}</h1>
        {best && <p className="text-sm text-muted-foreground">Điểm cao nhất: {best.best}/{best.total}</p>}
      </div>
      <ol className="space-y-3">
        {items.map((q, i) => (
          <li key={q.q + i}>
            <Card>
              <CardContent className="space-y-3 pt-5">
                <p className="font-medium" lang="en">
                  <span className="mr-2 text-sm text-muted-foreground">{i + 1}.</span>
                  {q.q}
                </p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Câu ${i + 1}`}>
                  {q.options.map((o, j) => {
                    const on = picked[i] === j;
                    const good = checked && j === q.answer;
                    const bad = checked && on && j !== q.answer;
                    return (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={checked}
                        onClick={() => {
                          setPicked((p) => ({ ...p, [i]: j }));
                          setError('');
                        }}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          on && !checked && 'border-primary bg-primary/10',
                          good && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                          bad && 'border-rose-500 bg-rose-50 dark:bg-rose-500/10',
                          !checked && !on && 'hover:bg-muted',
                        )}
                        lang="en"
                      >
                        <span className="mr-1.5 text-muted-foreground">{String.fromCharCode(65 + j)}.</span>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {checked && (
                  <p className={cn('flex items-start gap-1.5 text-sm', picked[i] === q.answer ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
                    {picked[i] === q.answer ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden />}
                    <span>{q.why_vi}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      {!checked ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="ghost" onClick={onLearn}>
            Xem lại lý thuyết
          </Button>
          <Button size="lg" onClick={check}>
            Chấm điểm
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-5">
            <p className="flex-1 font-semibold">
              {right}/{items.length} câu đúng · {pass ? 'Đạt — sang bước dịch câu.' : 'Chưa đạt 80%. Xem lại lý thuyết rồi làm lại.'}
            </p>
            {pass ? (
              <Button onClick={onNext}>
                Bước 3: dịch {topic.items.length} câu <ArrowRight />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onLearn}>
                  Xem lại lý thuyết
                </Button>
                <Button
                  onClick={() => {
                    setPicked({});
                    setChecked(false);
                  }}
                >
                  <RotateCcw /> Làm lại
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Formula({ topic, compact }: { topic: GrammarTopic; compact?: boolean }) {
  return (
    <Card className="border-teal-200 bg-teal-50/60 dark:border-teal-500/30 dark:bg-teal-500/5">
      <CardContent className={cn('space-y-2', compact ? 'pt-4 text-sm' : 'pt-5')}>
        <h2 className="font-semibold">Công thức</h2>
        <ul className="space-y-1.5">
          {topic.formula.map((f) => (
            <li key={f} className="rounded-md bg-background/80 px-3 py-1.5 font-mono text-[13px] leading-relaxed ring-1 ring-teal-100 dark:ring-teal-500/20">
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface Answer {
  typed: string;
  result: Checked;
  /** right on the first try (or accepted by the learner) */
  firstTry: boolean;
}

function Drill({ topic }: { topic: GrammarTopic }) {
  const [order, setOrder] = useState(() => topic.items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [typed, setTyped] = useState('');
  const [hint, setHint] = useState(false);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<Checked | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [showFormula, setShowFormula] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const finished = pos >= order.length;
  const idx = order[pos]!;
  const item = topic.items[idx];
  const passed = result && result.verdict !== 'wrong';

  useEffect(() => input.current?.focus(), [pos]);

  const check = () => {
    if (!typed.trim() || !item) return;
    const r = checkTranslation(item, typed);
    setResult(r);
    const ok = r.verdict !== 'wrong';
    setAnswers((a) => ({ ...a, [idx]: { typed, result: r, firstTry: ok && tries === 0 } }));
    setTries((n) => n + 1);
  };
  const accept = () => {
    if (!result) return;
    setAnswers((a) => ({ ...a, [idx]: { typed, result: { ...result, verdict: 'correct' }, firstTry: true } }));
    next();
  };
  const next = () => {
    setPos((p) => p + 1);
    setTyped('');
    setHint(false);
    setTries(0);
    setResult(null);
  };
  const restart = (only?: number[]) => {
    setOrder(only ?? topic.items.map((_, i) => i));
    setAnswers({});
    setPos(0);
    setTyped('');
    setHint(false);
    setTries(0);
    setResult(null);
  };

  if (finished) return <Summary topic={topic} order={order} answers={answers} onRetry={restart} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Back />
        <button type="button" onClick={() => setShowFormula((v) => !v)} className="flex items-center gap-1 text-sm text-teal-700 hover:underline dark:text-teal-300" aria-expanded={showFormula}>
          <BookOpen className="size-4" aria-hidden /> {showFormula ? 'Ẩn công thức' : 'Xem công thức'}
        </button>
      </div>
      {showFormula && <Formula topic={topic} compact />}

      <div>
        <div className="mb-1 flex justify-between text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{topic.title_vi}</span>
          <span className="tabular-nums">
            Câu {pos + 1}/{order.length}
          </span>
        </div>
        <Progress value={(pos / order.length) * 100} className="h-1.5" label="Tiến độ" />
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 text-4xl leading-none ring-1 ring-border dark:from-sky-500/10 dark:to-teal-500/10" aria-hidden>
              <span className="text-center [word-break:keep-all]">{item!.scene}</span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dịch sang tiếng Anh</p>
              <p className="text-xl font-semibold leading-snug sm:text-2xl" data-testid="vi">
                {item!.vi}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              ref={input}
              lang="en"
              rows={2}
              value={typed}
              disabled={Boolean(passed)}
              onChange={(e) => {
                setTyped(e.target.value);
                if (result && !passed) setResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return;
                e.preventDefault();
                if (passed) next();
                else check();
              }}
              placeholder="Gõ câu tiếng Anh… (Enter để kiểm tra)"
              className="text-lg"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Câu dịch của bạn"
            />
            {hint ? (
              <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <Lightbulb className="size-4 shrink-0" aria-hidden /> Gợi ý: <span lang="en">{item!.hint}</span>
              </p>
            ) : (
              !passed && (
                <button type="button" onClick={() => setHint(true)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Lightbulb className="size-4" aria-hidden /> Xem gợi ý
                </button>
              )
            )}
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
                <Button variant="ghost" onClick={accept} title="Câu của bạn đúng ngữ pháp và nghĩa nhưng chưa có trong đáp án">
                  <ThumbsUp /> Tôi viết đúng
                </Button>
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

function Feedback({ result, item }: { result: Checked; item: GrammarTopic['items'][number] }) {
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
            <CheckCircle2 className="size-5 text-amber-600" aria-hidden /> Đúng ngữ pháp — chỉ sai chính tả
          </>
        ) : (
          <>
            <X className="size-5 text-rose-600" aria-hidden /> Chưa đúng — so với đáp án gần nhất:
          </>
        )}
      </p>
      {result.verdict !== 'correct' && <DiffView result={result.diff} language="en" reveal />}
      {result.verdict !== 'correct' && (
        <p className="text-xs text-muted-foreground">
          <del className="text-destructive/70">gạch</del> = bỏ đi · <ins className="text-success no-underline">xanh</ins> = sửa thành · <span className="rounded border border-dashed border-warning px-1">khung</span> = còn thiếu
        </p>
      )}
      <p className="text-sm" lang="en">
        <span className="text-muted-foreground">Đáp án: </span>
        <b>{result.closest}</b>
      </p>
      {others.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Cách dịch khác cũng đúng ({others.length})</summary>
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

function Summary({ topic, order, answers, onRetry }: { topic: GrammarTopic; order: number[]; answers: Record<number, Answer>; onRetry: (only?: number[]) => void }) {
  const right = order.filter((i) => answers[i]?.firstTry);
  const wrong = order.filter((i) => !answers[i]?.firstTry);
  const full = order.length === topic.items.length;
  useEffect(() => {
    if (full) saveProgress(topic.id, right.length, order.length);
  }, [full, topic.id, right.length, order.length]);
  const nextTopic = TOPICS[TOPICS.findIndex((t) => t.id === topic.id) + 1];
  const pct = Math.round((right.length / order.length) * 100);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Back />
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-5xl" aria-hidden>
            {pct >= 85 ? '🏆' : pct >= 60 ? '👍' : '💪'}
          </p>
          <h1 className="text-2xl font-bold">
            {right.length}/{order.length} câu đúng ngay lần đầu
          </h1>
          <p className="text-muted-foreground">{pct >= 85 ? `Bạn đã nắm chắc ${topic.title_vi}.` : pct >= 60 ? 'Khá tốt — luyện lại các câu sai để nhớ lâu hơn.' : 'Xem lại công thức rồi luyện lại các câu sai nhé.'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {wrong.length > 0 && (
              <Button onClick={() => onRetry(wrong)}>
                <RotateCcw /> Luyện lại {wrong.length} câu sai
              </Button>
            )}
            <Button variant="outline" onClick={() => onRetry()}>
              Làm lại cả bài
            </Button>
            {nextTopic && (
              <Button asChild variant={wrong.length ? 'ghost' : 'default'}>
                <Link to={`/grammar/${nextTopic.id}`}>
                  {nextTopic.title_vi} <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {wrong.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="font-semibold">Câu cần xem lại</h2>
            <ul className="divide-y">
              {wrong.map((i) => (
                <li key={i} className="space-y-0.5 py-2.5 text-sm">
                  <p className="font-medium">{topic.items[i]!.vi}</p>
                  {answers[i] && (
                    <p className="text-muted-foreground" lang="en">
                      Bạn viết: <span className="text-rose-700 dark:text-rose-300">{answers[i]!.typed}</span>
                    </p>
                  )}
                  <p lang="en">
                    Đáp án: <b>{answers[i]?.result.closest ?? topic.items[i]!.en[0]}</b>
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Back() {
  return (
    <Link to="/grammar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
      <ArrowLeft className="size-3.5" aria-hidden /> Tất cả chủ điểm
    </Link>
  );
}
