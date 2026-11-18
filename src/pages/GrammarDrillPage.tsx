import { ArrowLeft, ArrowRight, BookOpen, Check, Lightbulb, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { WriteRunner } from '@/features/practice/WriteRunner';
import type { WriteItem } from '@/lib/practice/items';
import { firstRoundDone, firstScore, loadRun, record, runPassed, saveRun, toRedo, type RunState } from '@/lib/practice/retry';
import { topicState } from '@/lib/roadmap/progress';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GrammarDiagram } from '@/features/grammar/GrammarDiagram';
import { PASS, TOPICS, readProgress, readQuiz, saveProgress, saveQuiz, topicById, type GrammarTopic } from '@/lib/grammar/drills';
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
  const keys = useMemo(() => items.map((_, i) => ({ key: String(i) })), [items]);
  const storage = `quiz:${topic.id}`;
  const [run, setRun] = useState<RunState>(() => loadRun(storage, keys));
  // sentences open in this round: all of them at first, then only those still to redo
  const [open, setOpen] = useState<number[]>(() => (firstRoundDone(keys, run) ? [] : items.map((_, i) => i)));
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(() => firstRoundDone(keys, run));
  const [error, setError] = useState('');
  const [firstRound, setFirstRound] = useState(() => !firstRoundDone(keys, run));
  const { score } = firstScore(keys, run);
  const redo = toRedo(keys, run).map(Number);
  const pass = runPassed(keys, run);
  const best = readQuiz()[topic.id];
  const isRight = (i: number) => (open.includes(i) ? picked[i] === items[i]!.answer : run.first[String(i)] || run.fixed.includes(String(i)));
  const check = () => {
    const missing = open.find((i) => picked[i] === undefined);
    if (missing !== undefined) {
      setError(`Còn câu ${missing + 1} chưa chọn.`);
      return;
    }
    let st = run;
    for (const i of open) st = record(st, keys[i]!, firstRound, picked[i] === items[i]!.answer, picked[i] === items[i]!.answer);
    setRun(st);
    saveRun(storage, st);
    setChecked(true);
    const f = firstScore(keys, st);
    saveQuiz(topic.id, f.score, f.total, runPassed(keys, st));
  };
  const startRedo = () => {
    setFirstRound(false);
    setOpen(redo);
    setPicked((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !redo.includes(Number(k)))));
    setChecked(false);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Back />
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
          Bước 2 · nhận diện · cần đúng ngay lần đầu {Math.ceil(items.length * PASS)}/{items.length} — chưa đạt thì chỉ làm lại câu sai
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{topic.title_vi}</h1>
        {best && <p className="text-sm text-muted-foreground">Điểm cao nhất: {best.best}/{best.total}</p>}
      </div>
      <ol className="space-y-3">
        {items.map((q, i) => (
          <li key={q.q + i} className={cn(!checked && !open.includes(i) && 'opacity-60')}>
            <Card>
              <CardContent className="space-y-3 pt-5">
                <p className="font-medium" lang="en">
                  <span className="mr-2 text-sm text-muted-foreground">{i + 1}.</span>
                  {q.q}
                </p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Câu ${i + 1}`}>
                  {q.options.map((o, j) => {
                    const shown = checked || !open.includes(i);
                    const on = open.includes(i) ? picked[i] === j : shown && j === q.answer;
                    const good = shown && j === q.answer;
                    const bad = checked && open.includes(i) && on && j !== q.answer;
                    return (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={checked || !open.includes(i)}
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
                {(checked || !open.includes(i)) && (
                  <p className={cn('flex items-start gap-1.5 text-sm', isRight(i) ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
                    {isRight(i) ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden />}
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
              {score}/{items.length} câu đúng ngay lần đầu ·{' '}
              {pass ? 'Đạt — sang bước dịch câu.' : `Chưa đạt 80%. Chỉ cần làm lại ${redo.length} câu sai.`}
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
                <Button onClick={startRedo}>
                  <RotateCcw /> Làm lại {redo.length} câu sai
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

/** Step 3: translate the topic's sentences — the shared runner: ≥ 80 % first try, otherwise redo only the wrong ones. */
function Drill({ topic }: { topic: GrammarTopic }) {
  const [showFormula, setShowFormula] = useState(false);
  const items = useMemo<WriteItem[]>(() => topic.items.map((it, i) => ({ key: `${topic.id}:${i}`, prompt: it.vi, en: it.en, hint: it.hint, scene: it.scene })), [topic]);
  const nextTopic = TOPICS[TOPICS.findIndex((t) => t.id === topic.id) + 1];
  const best = readProgress()[topic.id];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Back />
        <button type="button" onClick={() => setShowFormula((v) => !v)} className="flex items-center gap-1 text-sm text-teal-700 hover:underline dark:text-teal-300" aria-expanded={showFormula}>
          <BookOpen className="size-4" aria-hidden /> {showFormula ? 'Ẩn công thức' : 'Xem công thức'}
        </button>
      </div>
      {showFormula && <Formula topic={topic} compact />}
      {best && (
        <p className="text-sm text-muted-foreground">
          Đúng ngay lần đầu cao nhất: {best.best}/{best.total}
          {topicState(topic.id).drillOk && ' · ✓ đã qua'}
        </p>
      )}
      <WriteRunner
        items={items}
        mode="translate"
        heading={topic.title_vi}
        storageKey={`grammar:${topic.id}`}
        onFinish={(score, total, _a, passed) => saveProgress(topic.id, score, total, passed)}
        extra={
          <>
            <Button asChild variant="outline">
              <Link to={`/grammar/${topic.id}/sua-loi`}>Luyện sửa lỗi sai</Link>
            </Button>
            {nextTopic && (
              <Button asChild variant="ghost">
                <Link to={`/grammar/${nextTopic.id}`}>
                  {nextTopic.title_vi} <ArrowRight />
                </Link>
              </Button>
            )}
          </>
        }
      />
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
