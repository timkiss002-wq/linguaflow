import { ArrowLeft, BookOpen, Clock, Headphones, Highlighter, Pause, Play, RotateCcw, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSaveIeltsAttempt } from '@/features/ielts/api';
import { useIeltsTarget } from '@/features/learner/useIeltsTarget';
import type { Highlight } from '@/features/ielts/highlights';
import { Passage, type TextSize } from '@/features/ielts/Passage';
import { Highlighted, QuestionGroups } from '@/features/ielts/QuestionGroups';
import { useScriptPlayer } from '@/features/ielts/useScriptPlayer';
import { markDailyDone } from '@/lib/daily';
import { toUserMessage } from '@/lib/errors';
import {
  TYPE_LABEL,
  bandFor,
  fmtBand,
  markParts,
  partQuestions,
  rawFor,
  statsByType,
  testById,
  type Mark,
  type PracticeTest,
  type QuestionResult,
  type TestPart,
} from '@/lib/ielts/tests';
import { cn } from '@/lib/utils';

type Mode = 'exam' | 'practice';
interface Saved {
  answers: Record<number, string>;
  seconds: number;
  results?: QuestionResult[];
  /** reading: the learner's highlights, per part */
  highlights?: Record<string, Highlight[]>;
}

const storeKey = (test: string, parts: string[], mode: Mode) => `ielts:${test}:${parts.join('+')}:${mode}`;
function read(key: string): Saved | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: Saved | null) {
  try {
    if (v) localStorage.setItem(key, JSON.stringify(v));
    else localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export default function IeltsTestPage() {
  const { testId = '' } = useParams();
  const [params] = useSearchParams();
  // "Làm lại" starts a fresh runner without reloading the page
  const [run, setRun] = useState(0);
  const test = testById(testId);
  if (!test)
    return (
      <EmptyState
        icon={BookOpen}
        title="Không tìm thấy đề"
        action={
          <Button asChild variant="outline">
            <Link to="/ielts/reading">Về thư viện đề</Link>
          </Button>
        }
      />
    );
  const parts = (params.get('parts') ?? '').split(',').filter((p) => test.parts.some((x) => x.id === p));
  const mode: Mode = params.get('mode') === 'exam' ? 'exam' : 'practice';
  if (!parts.length) return <Setup test={test} />;
  return <Runner key={`${parts.join()}-${mode}-${run}`} test={test} partIds={parts} mode={mode} onRestart={() => setRun((n) => n + 1)} />;
}

function Setup({ test }: { test: PracticeTest }) {
  const [, setParams] = useSearchParams();
  const all = test.parts.map((p) => p.id).join(',');
  const Icon = test.skill === 'reading' ? BookOpen : Headphones;
  return (
    <>
      <PageHeader title={test.title} description={<BackLink skill={test.skill} />} />
      <div className={cn('grid gap-4', !test.pack && 'md:grid-cols-2')}>
        {!test.pack && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="size-5 text-teal-600" aria-hidden /> Cả bài — 40 câu
              </CardTitle>
              <CardDescription>Làm như thi thật để biết band ước lượng.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button className="h-auto flex-col items-start whitespace-normal py-2.5 text-left" onClick={() => setParams({ parts: all, mode: 'exam' })} data-start="exam">
                <span className="font-semibold">Thi thử ({test.minutes} phút)</span>
                <span className="text-xs font-normal opacity-90">
                  {test.skill === 'listening' ? 'Mỗi phần chỉ nghe một lần, hết giờ tự nộp bài.' : 'Đếm ngược, hết giờ tự nộp bài.'}
                </span>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-start whitespace-normal py-2.5 text-left" onClick={() => setParams({ parts: all, mode: 'practice' })} data-start="practice">
                <span className="font-semibold">Luyện tập (không giới hạn giờ)</span>
                <span className="text-xs font-normal text-muted-foreground">{test.skill === 'listening' ? 'Nghe lại, tạm dừng, chỉnh tốc độ thoải mái.' : 'Làm thong thả, vẫn chấm và giải thích đầy đủ.'}</span>
              </Button>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Từng phần</CardTitle>
            <CardDescription>Luyện tập một phần (không tính band).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {test.parts.map((p) => (
              <Button key={p.id} variant="outline" className="h-auto justify-between whitespace-normal py-2.5 text-left" onClick={() => setParams({ parts: p.id, mode: 'practice' })}>
                <span>
                  <span className="font-semibold">{p.title}</span> <span className="text-muted-foreground">· {p.heading}</span>
                </span>
                <span className="text-xs text-muted-foreground">{partQuestions(p).length} câu</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ReadingTools({ size, onSize, count, onClear }: { size: TextSize; onSize: (s: TextSize) => void; count: number; onClear: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <p className="flex items-center gap-1.5">
        <Highlighter className="size-4 text-amber-600" aria-hidden /> Bôi đen chữ trong bài đọc để tô vàng; bấm vào chỗ đã tô để bỏ.
        {count > 0 && (
          <button type="button" onClick={onClear} className="ml-1 text-primary hover:underline">
            Xoá {count} chỗ tô
          </button>
        )}
      </p>
      <div role="group" aria-label="Cỡ chữ" className="flex items-center rounded-full border bg-card p-0.5">
        {(['sm', 'md', 'lg'] as const).map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => onSize(s)}
            aria-pressed={size === s}
            className={cn('rounded-full px-2.5 py-0.5 font-semibold', ['text-xs', 'text-sm', 'text-base'][i], size === s ? 'bg-foreground text-background' : 'hover:text-foreground')}
          >
            A
          </button>
        ))}
      </div>
    </div>
  );
}

function BackLink({ skill }: { skill: PracticeTest['skill'] }) {
  return (
    <Link to={`/ielts/${skill}`} className="inline-flex items-center gap-1 hover:underline">
      <ArrowLeft className="size-3.5" aria-hidden /> Thư viện đề
    </Link>
  );
}

function Runner({ test, partIds, mode, onRestart }: { test: PracticeTest; partIds: string[]; mode: Mode; onRestart: () => void }) {
  const parts = test.parts.filter((p) => partIds.includes(p.id));
  const key = storeKey(test.id, partIds, mode);
  const initial = useMemo(() => read(key), [key]);
  const [answers, setAnswers] = useState<Record<number, string>>(initial?.answers ?? {});
  const [results, setResults] = useState<QuestionResult[] | null>(initial?.results ?? null);
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [highlights, setHighlights] = useState<Record<string, Highlight[]>>(initial?.highlights ?? {});
  const [size, setSize] = useState<TextSize>(() => {
    try {
      return (localStorage.getItem('ielts:text-size') as TextSize | null) ?? 'md';
    } catch {
      return 'md';
    }
  });
  const changeSize = (s: TextSize) => {
    setSize(s);
    try {
      localStorage.setItem('ielts:text-size', s);
    } catch {
      /* private mode */
    }
  };
  const seconds = useRef(initial?.seconds ?? 0);
  const [, tick] = useState(0);
  const save = useSaveIeltsAttempt();
  const limit = Math.round((test.minutes * 60 * parts.length) / test.parts.length);
  const part = parts[Math.min(tab, parts.length - 1)]!;
  const total = parts.reduce((n, p) => n + partQuestions(p).length, 0);
  const answered = Object.values(answers).filter((v) => v.trim()).length;

  const submit = async () => {
    if (results) return;
    const r = markParts(test, partIds, answers);
    setResults(r);
    setTab(0);
    write(key, { answers, seconds: seconds.current, results: r, highlights });
    window.scrollTo({ top: 0 });
    const correct = r.filter((x) => x.mark === 'correct').length;
    // a listening Part 1 on its own counts as today's listening task
    if (test.skill === 'listening' && partIds.length === 1 && (test.pack || test.parts[0]?.id === partIds[0])) markDailyDone('listening');
    try {
      await save.mutateAsync({ testId: test.id, skill: test.skill, parts: partIds, mode, results: r, answers, band: bandFor(test.skill, correct, r.length), seconds: seconds.current });
    } catch (e) {
      toast.error(`Không lưu được kết quả: ${toUserMessage(e)}`);
    }
  };

  // timer (and auto-submit when an exam runs out of time)
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    if (results) return;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible' && mode === 'practice') return;
      seconds.current += 1;
      tick((n) => n + 1);
      if (mode === 'exam' && seconds.current >= limit) void submitRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, [results, mode, limit]);

  useEffect(() => {
    write(key, { answers, seconds: seconds.current, highlights, ...(results ? { results } : {}) });
  }, [answers, key, results, highlights]);

  const showEvidence = (n: number) => {
    const p = parts.findIndex((x) => partQuestions(x).some(({ q }) => q.n === n));
    if (p >= 0) setTab(p);
    setActive(n);
    setTimeout(() => document.getElementById(`ev-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const reset = () => {
    write(key, null);
    window.scrollTo({ top: 0 });
    onRestart();
  };

  const marks: Record<number, Mark> = Object.fromEntries((results ?? []).map((r) => [r.n, r.mark]));
  const left = limit - seconds.current;

  return (
    <>
      <PageHeader
        title={test.title}
        description={
          <div className="space-y-1">
            <BackLink skill={test.skill} />
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{parts.length === test.parts.length ? 'Cả bài' : parts[0]!.title}</Badge>
              <Badge variant={mode === 'exam' ? 'accent' : 'secondary'}>{mode === 'exam' ? 'Thi thử' : 'Luyện tập'}</Badge>
            </div>
          </div>
        }
        actions={
          !results && (
            <>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm tabular-nums', mode === 'exam' && left < 300 && 'border-destructive text-destructive')} data-testid="timer">
                <Clock className="size-4" aria-hidden /> {mode === 'exam' ? clock(left) : clock(seconds.current)}
              </span>
              <Button onClick={() => (answered < total ? setConfirming(true) : void submit())}>
                <Send className="size-4" /> Nộp bài
              </Button>
            </>
          )
        }
      />

      {results && <Summary test={test} results={results} onReset={reset} />}

      {parts.length > 1 && (
        <nav aria-label="Parts" className="mb-4 flex gap-1 overflow-x-auto pb-1">
          {parts.map((p, i) => {
            const qs = partQuestions(p);
            const done = qs.filter(({ q }) => answers[q.n]?.trim()).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setTab(i)}
                aria-current={i === tab}
                className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-border', i === tab ? 'bg-teal-600 text-white ring-teal-600' : 'bg-card text-muted-foreground hover:text-foreground')}
              >
                {p.title} <span className="ml-1 text-xs opacity-80 tabular-nums">{results ? `${qs.filter(({ q }) => marks[q.n] === 'correct').length}/${qs.length}` : `${done}/${qs.length}`}</span>
              </button>
            );
          })}
        </nav>
      )}

      {test.skill === 'reading' ? (
        <>
          <ReadingTools size={size} onSize={changeSize} count={(highlights[part.id] ?? []).length} onClear={() => setHighlights((h) => ({ ...h, [part.id]: [] }))} />
          {/* Two panes that scroll on their own, like the computer-based test: the passage never scrolls away from the questions. */}
          <div className="grid gap-4 lg:h-[calc(100vh-8rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Card className="lg:overflow-y-auto">
              <CardContent className="mx-auto max-w-[72ch] space-y-4 px-5 pt-6 sm:px-8" data-testid="passage">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{part.title}</p>
                <h2 className="text-2xl font-bold leading-tight">{part.heading}</h2>
                <Passage
                  part={part}
                  size={size}
                  highlights={highlights[part.id] ?? []}
                  onChange={(h) => setHighlights((all) => ({ ...all, [part.id]: h }))}
                  evidence={results ? { marks: partQuestions(part).map(({ q }) => ({ n: q.n, quote: q.evidence })), active } : undefined}
                />
              </CardContent>
            </Card>
            <Card className="lg:overflow-y-auto">
              <CardContent className={cn('px-5 pt-6 sm:px-6', size === 'lg' ? 'text-[17px]' : size === 'md' ? 'text-[15.5px]' : 'text-sm')}>
                <QuestionGroups groups={part.groups} answers={answers} onAnswer={(n, v) => setAnswers((a) => ({ ...a, [n]: v }))} review={results ? { marks, active, onShowEvidence: showEvidence } : undefined} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <ListeningAudio key={part.id} part={part} mode={mode} finished={Boolean(results)} active={active} />
          <Card>
            <CardContent className="pt-5">
              <QuestionGroups groups={part.groups} answers={answers} onAnswer={(n, v) => setAnswers((a) => ({ ...a, [n]: v }))} review={results ? { marks, active, onShowEvidence: showEvidence } : undefined} />
            </CardContent>
          </Card>
        </div>
      )}

      {!results && tab < parts.length - 1 && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => (setTab(tab + 1), window.scrollTo({ top: 0 }))}>
            {parts[tab + 1]!.title} →
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Bạn mới trả lời ${answered}/${total} câu`}
        description="Bấm vào số câu để quay lại làm tiếp, hoặc nộp luôn."
        confirmLabel="Nộp bài"
        cancelLabel="Làm tiếp"
        onConfirm={() => void submit()}
      >
        <div className="flex flex-wrap gap-1.5" data-testid="unanswered">
          {parts
            .flatMap((p) => partQuestions(p).map(({ q }) => q.n))
            .filter((n) => !answers[n]?.trim())
            .map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setConfirming(false);
                  const p = parts.findIndex((x) => partQuestions(x).some(({ q }) => q.n === n));
                  if (p >= 0) setTab(p);
                  setTimeout(() => {
                    const li = document.getElementById(`q-${n}`);
                    li?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    li?.querySelector<HTMLElement>('input, select, [role=radio]')?.focus({ preventScroll: true });
                  }, 50);
                }}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1 text-xs font-semibold tabular-nums hover:border-primary hover:bg-accent"
              >
                {n}
              </button>
            ))}
        </div>
      </ConfirmDialog>
    </>
  );
}

const STRESS_KEY = 'lf.listening.stress';

/** The audio player and, after marking, the transcript — sharing one player so any line can be replayed. */
function ListeningAudio({ part, mode, finished, active }: { part: TestPart; mode: Mode; finished: boolean; active: number | null }) {
  const [rate, setRate] = useState(1);
  const [stress, setStressState] = useState(() => {
    try {
      return localStorage.getItem(STRESS_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const setStress = (v: boolean) => {
    setStressState(v);
    try {
      localStorage.setItem(STRESS_KEY, v ? 'on' : 'off');
    } catch {
      /* private mode */
    }
  };
  const p = useScriptPlayer(part, rate, 1, stress);
  return (
    <>
      <AudioPanel part={part} mode={mode} finished={finished} p={p} rate={rate} onRate={setRate} stress={stress} onStress={setStress} />
      {finished && <Transcript part={part} active={active} p={p} />}
    </>
  );
}

type Player = ReturnType<typeof useScriptPlayer>;

function AudioPanel({
  part,
  mode,
  finished,
  p,
  rate,
  onRate,
  stress,
  onStress,
}: {
  part: TestPart;
  mode: Mode;
  finished: boolean;
  p: Player;
  rate: number;
  onRate: (r: number) => void;
  stress: boolean;
  onStress: (v: boolean) => void;
}) {
  const examLocked = mode === 'exam' && !finished && p.plays >= 1 && p.state !== 'playing';
  const free = mode === 'practice' || finished;
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{part.title}</p>
            <h2 className="text-lg font-bold">{part.heading}</h2>
            <p className="text-sm text-muted-foreground">{part.context}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {p.state === 'playing' ? (
              free ? (
                <Button variant="outline" onClick={p.pause}>
                  <Pause className="size-4" /> Tạm dừng
                </Button>
              ) : (
                <Badge variant="accent">Đang phát…</Badge>
              )
            ) : (
              <Button onClick={() => void p.play()} disabled={examLocked} data-testid="play">
                <Play className="size-4" /> {p.state === 'paused' ? 'Nghe tiếp' : p.state === 'done' || p.plays > 0 ? 'Nghe lại' : 'Bắt đầu nghe'}
              </Button>
            )}
            {free && p.state !== 'idle' && (
              <Button variant="ghost" size="sm" onClick={p.restart}>
                <RotateCcw className="size-4" /> Từ đầu
              </Button>
            )}
            {free && (
              <select aria-label="Speed" value={rate} onChange={(e) => onRate(Number(e.target.value))} className="h-8 rounded-md border bg-card px-2 text-xs">
                {[0.8, 0.9, 1, 1.1].map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <Progress value={p.total ? (p.line / p.total) * 100 : 0} label="Audio progress" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {examLocked
              ? 'Thi thử: mỗi phần chỉ được nghe một lần.'
              : mode === 'exam' && !finished
                ? 'Đọc trước câu hỏi, rồi bấm nghe — chỉ được nghe một lần.'
                : 'Giọng đọc của trình duyệt. Sau khi nộp bài: transcript, nghe lại từng câu.'}
            {p.error && <span className="ml-1 text-destructive">{p.error}</span>}
          </p>
          <label
            className="flex cursor-pointer items-center gap-2 text-xs"
            title="Đọc chậm lại và ngắt nhẹ trước từ khóa, tên được đánh vần và con số — như cách bài thi thật nhấn rõ thông tin quan trọng"
          >
            <input type="checkbox" className="size-4 accent-teal-600" checked={stress} onChange={(e) => onStress(e.target.checked)} data-testid="stress" />
            Nhấn rõ từ khóa
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Transcript({ part, active, p }: { part: TestPart; active: number | null; p: Player }) {
  const marks = partQuestions(part).map(({ q }) => ({
    n: q.n,
    quote: q.evidence,
  }));
  const evidence = partQuestions(part).find(({ q }) => q.n === active)?.q.evidence;
  const evLine = evidence ? part.script!.findIndex(([, t]) => t?.includes(evidence)) : -1;
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  useEffect(() => {
    if (evLine >= 0)
      lineRefs.current[evLine]?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
  }, [evLine]);
  const playingLine = p.state === 'playing' ? (p.single ?? p.line) : -1;
  return (
    <details className="rounded-lg border bg-card p-4" open>
      <summary className="cursor-pointer font-medium">Transcript · bấm ▶ để nghe lại từng câu</summary>
      <div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto pr-1 text-sm leading-relaxed" lang="en" data-testid="transcript">
        {part.script!.map(([who, text], i) => (
          <p
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={cn('flex gap-2 rounded-md px-1.5 py-1 transition-colors', i === playingLine && 'bg-teal-50 dark:bg-teal-500/10', i === evLine && 'ring-1 ring-amber-400')}
          >
            <button
              type="button"
              onClick={() => p.playLine(i)}
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:border-teal-600 hover:text-teal-700"
              aria-label={`Nghe lại câu ${i + 1}`}
              data-line={i}
            >
              <Play className="size-3" aria-hidden />
            </button>
            <span>
              <span className="mr-1 font-semibold text-muted-foreground">{part.speakers?.[who!]?.name}:</span>
              <Highlighted text={text!} marks={marks} active={active} />
            </span>
          </p>
        ))}
      </div>
    </details>
  );
}

function Summary({ test, results, onReset }: { test: PracticeTest; results: QuestionResult[]; onReset: () => void }) {
  const correct = results.filter((r) => r.mark === 'correct').length;
  const band = bandFor(test.skill, correct, results.length);
  const stats = statsByType(results);
  const goal = useIeltsTarget();
  const target = rawFor(test.skill, goal.band);
  return (
    <Card className="mb-5" data-testid="summary">
      <CardContent className="grid gap-5 pt-5 md:grid-cols-[auto_1fr]">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Số câu đúng</p>
            <p className="text-3xl font-bold tabular-nums">
              {correct}/{results.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Band ước lượng</p>
            <p className="text-3xl font-bold tabular-nums">{band === null ? '—' : fmtBand(band)}</p>
            {band === null ? <p className="text-xs text-muted-foreground">chỉ tính cho cả bài 40 câu</p> : target && correct < target && <p className="text-xs text-muted-foreground">cần {target - correct} câu nữa để đạt {fmtBand(goal.band)}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Theo dạng câu hỏi</p>
          <ul className="space-y-1.5 text-sm">
            {stats.map((s) => {
              const p = Math.round((s.correct / s.answered) * 100);
              return (
                <li key={s.type} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                  <span>
                    {TYPE_LABEL[s.type].en} <span className="text-xs text-muted-foreground">· {TYPE_LABEL[s.type].vi}</span>
                    {s.form > 0 && <span className="ml-1 text-xs text-warning">({s.form} lỗi chính tả / quá số từ)</span>}
                  </span>
                  <span className="tabular-nums">
                    {s.correct}/{s.answered}
                  </span>
                  <Progress value={p} className="col-span-2 h-1" label={`${TYPE_LABEL[s.type].en} ${p}%`} />
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="size-4" /> Làm lại
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/ielts/${test.skill}`}>Chọn bài khác</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Bấm “Xem chỗ có đáp án trong bài” dưới mỗi câu để thấy câu chứa đáp án được tô màu.</p>
        </div>
      </CardContent>
    </Card>
  );
}
