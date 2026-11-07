import { ArrowLeft, BookOpen, Headphones, Pause, Play, RotateCcw, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ExamClock, ExamFrame, SplitPane } from '@/features/exam/ExamFrame';
import { ExamSettings } from '@/features/exam/ExamSettings';
import { isTyping, useExamPrefs, type TextSize } from '@/features/exam/prefs';
import { QuestionNav, type NavMark } from '@/features/exam/QuestionNav';
import { useSaveIeltsAttempt } from '@/features/ielts/api';
import type { Highlight } from '@/features/ielts/highlights';
import { Passage } from '@/features/ielts/Passage';
import { Highlighted, QuestionGroups } from '@/features/ielts/QuestionGroups';
import { useScriptPlayer } from '@/features/ielts/useScriptPlayer';
import { useIeltsTarget } from '@/features/learner/useIeltsTarget';
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
  /** reading: notes on highlights, per part */
  notes?: Record<string, Record<string, string>>;
  /** questions marked "review later" */
  flagged?: number[];
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

const QUESTION_SIZE: Record<TextSize, string> = { sm: 'text-sm', md: 'text-[15.5px]', lg: 'text-[17px]' };

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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="size-5 text-teal-700" aria-hidden /> Cả bài — 40 câu
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

function BackLink({ skill }: { skill: PracticeTest['skill'] }) {
  return (
    <Link to={`/ielts/${skill}`} className="inline-flex items-center gap-1 hover:underline">
      <ArrowLeft className="size-3.5" aria-hidden /> Thư viện đề {skill === 'reading' ? 'Reading' : 'Listening'}
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
  const [current, setCurrent] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set(initial?.flagged ?? []));
  const [highlights, setHighlights] = useState<Record<string, Highlight[]>>(initial?.highlights ?? {});
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>(initial?.notes ?? {});
  const [confirming, setConfirming] = useState(false);
  const [prefs, setPrefs] = useExamPrefs();
  const seconds = useRef(initial?.seconds ?? 0);
  const [, tick] = useState(0);
  const save = useSaveIeltsAttempt();
  const limit = Math.round((test.minutes * 60 * parts.length) / test.parts.length);
  const part = parts[Math.min(tab, parts.length - 1)]!;
  const navParts = useMemo(() => parts.map((p) => ({ id: p.id, title: p.title, numbers: partQuestions(p).map(({ q }) => q.n) })), [parts]);
  const numbers = useMemo(() => navParts.flatMap((p) => p.numbers), [navParts]);
  const isAnswered = useCallback((n: number) => Boolean(answers[n]?.trim()), [answers]);
  const unanswered = numbers.filter((n) => !isAnswered(n));
  const marks: Record<number, Mark> = useMemo(() => Object.fromEntries((results ?? []).map((r) => [r.n, r.mark])), [results]);
  const navMarks: Record<number, NavMark> | undefined = results ? Object.fromEntries(results.map((r) => [r.n, r.mark === 'correct' ? 'correct' : 'wrong'])) : undefined;

  const submit = async () => {
    if (results) return;
    const r = markParts(test, partIds, answers);
    setResults(r);
    setTab(0);
    setCurrent(null);
    // show the score: both panes back to the top
    document.querySelectorAll('[data-pane], [data-exam-scroll]').forEach((el) => el.scrollTo({ top: 0 }));
    write(key, { answers, seconds: seconds.current, results: r, highlights, notes, flagged: [...flagged] });
    const correct = r.filter((x) => x.mark === 'correct').length;
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
    write(key, { answers, seconds: seconds.current, highlights, notes, flagged: [...flagged], ...(results ? { results } : {}) });
  }, [answers, key, results, highlights, notes, flagged]);

  /** Jump to a question: switch part, scroll it into view inside its pane, put the cursor in it. */
  const go = useCallback(
    (n: number) => {
      const p = navParts.findIndex((x) => x.numbers.includes(n));
      if (p >= 0) setTab(p);
      setCurrent(n);
      if (results) setActive(n);
      setTimeout(() => {
        const li = document.getElementById(`q-${n}`);
        li?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!results) li?.querySelector<HTMLElement>('input, select, [role=radio][aria-checked=true], [role=radio]')?.focus({ preventScroll: true });
        if (results) document.getElementById(`ev-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 30);
    },
    [navParts, results],
  );
  const step = useCallback(
    (dir: -1 | 1) => {
      const i = current === null ? (dir === 1 ? -1 : 0) : numbers.indexOf(current);
      const next = numbers[Math.min(numbers.length - 1, Math.max(0, i + dir))];
      if (next !== undefined) go(next);
    },
    [current, numbers, go],
  );
  const toggleFlag = useCallback(() => {
    if (current === null) return;
    setFlagged((f) => {
      const next = new Set(f);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });
  }, [current]);

  // keyboard: ← → move between questions, F flags the current one (not while typing an answer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || confirming) return;
      if ((e.target as HTMLElement | null)?.closest('[role=dialog],[role=separator]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        step(e.key === 'ArrowRight' ? 1 : -1);
      } else if ((e.key === 'f' || e.key === 'F') && !results) {
        e.preventDefault();
        toggleFlag();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, toggleFlag, results, confirming]);

  const restart = () => {
    write(key, null);
    onRestart();
  };

  const questions = (
    <div className={cn('px-6 py-5', QUESTION_SIZE[prefs.size])}>
      {results && <Summary test={test} results={results} onReset={restart} />}
      <QuestionGroups
        groups={part.groups}
        answers={answers}
        onAnswer={(n, v) => setAnswers((a) => ({ ...a, [n]: v }))}
        review={results ? { marks, active, onShowEvidence: go } : undefined}
        current={current}
        onCurrent={setCurrent}
        flagged={results ? undefined : flagged}
      />
      {!results && tab < parts.length - 1 && (
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => go(navParts[tab + 1]!.numbers[0]!)}>
            Sang {parts[tab + 1]!.title} →
          </Button>
        </div>
      )}
    </div>
  );

  const partNotes = notes[part.id] ?? {};
  const partHighlights = highlights[part.id] ?? [];
  const firstN = navParts[tab]!.numbers[0];
  const lastN = navParts[tab]!.numbers.at(-1);

  return (
    <ExamFrame
      exit={{ to: `/ielts/${test.skill}`, label: 'Thoát phòng thi, về thư viện đề' }}
      theme={prefs.theme}
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{test.title}</span>
          <Badge variant={mode === 'exam' ? 'accent' : 'secondary'} className="shrink-0">
            {results ? 'Đã nộp' : mode === 'exam' ? 'Thi thử' : 'Luyện tập'}
          </Badge>
        </span>
      }
      timer={!results && <ExamClock seconds={seconds.current} limit={limit} countdown={mode === 'exam'} blink={prefs.blink} />}
      actions={
        <>
          <ExamSettings
            prefs={prefs}
            onChange={setPrefs}
            volume={test.skill === 'listening'}
            help={
              <>
                {test.skill === 'reading' && <p>Bôi đen chữ trong bài đọc để tô vàng. Bấm vào chỗ đã tô để bỏ; chuột phải để ghi chú.</p>}
                <p>
                  Phím tắt: <kbd className="rounded border px-1">←</kbd> <kbd className="rounded border px-1">→</kbd> chuyển câu, <kbd className="rounded border px-1">F</kbd> đánh dấu xem lại (khi không ở trong ô điền).
                </p>
                <p>Kéo thanh giữa hai cột để đổi độ rộng.</p>
                {test.skill === 'reading' && partHighlights.length > 0 && (
                  <button type="button" onClick={() => (setHighlights((h) => ({ ...h, [part.id]: [] })), setNotes((x) => ({ ...x, [part.id]: {} })))} className="font-medium text-primary hover:underline">
                    Xoá {partHighlights.length} chỗ tô ở {part.title}
                  </button>
                )}
              </>
            }
          />
          {results ? (
            <Button size="sm" variant="outline" onClick={restart}>
              <RotateCcw className="size-4" /> Làm lại
            </Button>
          ) : (
            <Button size="sm" onClick={() => setConfirming(true)} data-testid="submit">
              <Send className="size-4" /> Nộp bài
            </Button>
          )}
        </>
      }
      footer={
        <QuestionNav
          parts={navParts}
          part={tab}
          current={current}
          isAnswered={isAnswered}
          flagged={flagged}
          marks={navMarks}
          onGo={go}
          onPart={(i) => go(navParts[i]!.numbers[0]!)}
          onFlag={toggleFlag}
          onStep={step}
        />
      }
    >
      {test.skill === 'reading' ? (
        <SplitPane
          split={prefs.split}
          onSplit={(split) => setPrefs({ split })}
          leftLabel="Bài đọc"
          rightLabel="Câu hỏi"
          left={
            <div className="mx-auto max-w-[72ch] space-y-4 px-8 py-6" data-testid="passage">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{part.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground" lang="en">
                  You should spend about 20 minutes on Questions {firstN}–{lastN}, which are based on {part.title} below.
                </p>
              </div>
              <h2 className="text-2xl font-bold leading-tight" lang="en">
                {part.heading}
              </h2>
              <div lang="en">
                <Passage
                  part={part}
                  size={prefs.size}
                  highlights={partHighlights}
                  onChange={(h) => setHighlights((all) => ({ ...all, [part.id]: h }))}
                  notes={partNotes}
                  onNote={(k, text) =>
                    setNotes((all) => {
                      const next = { ...(all[part.id] ?? {}) };
                      if (text) next[k] = text;
                      else delete next[k];
                      return { ...all, [part.id]: next };
                    })
                  }
                  evidence={results ? { marks: partQuestions(part).map(({ q }) => ({ n: q.n, quote: q.evidence })), active } : undefined}
                />
              </div>
            </div>
          }
          right={<div lang="en">{questions}</div>}
        />
      ) : results ? (
        <SplitPane
          split={prefs.split}
          onSplit={(split) => setPrefs({ split })}
          leftLabel="Audio và transcript"
          rightLabel="Câu hỏi"
          left={
            <div className="space-y-4 px-6 py-5">
              <AudioPanel key={part.id} part={part} mode={mode} finished volume={prefs.volume} />
              <Transcript part={part} active={active} />
            </div>
          }
          right={questions}
        />
      ) : (
        <div className="h-full overflow-y-auto overscroll-contain" data-exam-scroll>
          <div className="mx-auto max-w-4xl">
            <div className="sticky top-0 z-10 bg-background px-6 pt-4">
              <AudioPanel key={part.id} part={part} mode={mode} finished={false} volume={prefs.volume} />
            </div>
            <div lang="en">{questions}</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={unanswered.length ? `Còn ${unanswered.length} câu chưa làm` : 'Nộp bài?'}
        description={unanswered.length ? 'Bấm vào số câu để quay lại làm tiếp, hoặc nộp luôn.' : 'Sau khi nộp bạn sẽ thấy đáp án và giải thích, không sửa được nữa.'}
        confirmLabel="Nộp bài"
        cancelLabel="Làm tiếp"
        onConfirm={() => void submit()}
      >
        {unanswered.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid="unanswered">
            {unanswered.map((n) => (
              <button key={n} type="button" onClick={() => (setConfirming(false), go(n))} className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1 text-xs font-semibold tabular-nums hover:border-primary hover:bg-accent">
                {n}
              </button>
            ))}
          </div>
        )}
        {flagged.size > 0 && (
          <p className="text-sm text-muted-foreground">
            Đang đánh dấu xem lại:{' '}
            {[...flagged]
              .sort((a, b) => a - b)
              .map((n, i) => (
                <button key={n} type="button" onClick={() => (setConfirming(false), go(n))} className="font-semibold text-warning hover:underline">
                  {i ? ', ' : ''}
                  {n}
                </button>
              ))}
          </p>
        )}
      </ConfirmDialog>
    </ExamFrame>
  );
}

function AudioPanel({ part, mode, finished, volume }: { part: TestPart; mode: Mode; finished: boolean; volume: number }) {
  const [rate, setRate] = useState(1);
  const p = useScriptPlayer(part, rate, volume);
  const examLocked = mode === 'exam' && !finished && p.plays >= 1 && p.state !== 'playing';
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{part.title}</p>
            <h2 className="text-lg font-bold" lang="en">
              {part.heading}
            </h2>
            <p className="text-sm text-muted-foreground" lang="en">
              {part.context}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {p.state === 'playing' ? (
              mode === 'practice' || finished ? (
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
            {(mode === 'practice' || finished) && p.state !== 'idle' && (
              <Button variant="ghost" size="sm" onClick={p.restart}>
                <RotateCcw className="size-4" /> Từ đầu
              </Button>
            )}
            {(mode === 'practice' || finished) && (
              <select aria-label="Tốc độ" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-8 rounded-md border bg-card px-2 text-xs">
                {[0.8, 0.9, 1, 1.1].map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <Progress value={p.total ? (p.line / p.total) * 100 : 0} label="Tiến độ audio" />
        <p className="text-xs text-muted-foreground">
          {examLocked ? 'Thi thử: mỗi phần chỉ được nghe một lần.' : mode === 'exam' && !finished ? 'Đọc trước câu hỏi, rồi bấm nghe — chỉ được nghe một lần. Chỉnh âm lượng trong Cài đặt.' : 'Giọng đọc của trình duyệt. Transcript hiện sau khi nộp bài.'}
          {p.error && <span className="ml-1 text-destructive">{p.error}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function Transcript({ part, active }: { part: TestPart; active: number | null }) {
  const marks = partQuestions(part).map(({ q }) => ({ n: q.n, quote: q.evidence }));
  return (
    <details className="rounded-lg border bg-card p-4" open>
      <summary className="cursor-pointer font-medium">Transcript</summary>
      <div className="mt-3 space-y-1.5 text-sm leading-relaxed" lang="en" data-testid="transcript">
        {part.script!.map(([who, text], i) => (
          <p key={i}>
            <span className="mr-1 font-semibold text-muted-foreground">{part.speakers?.[who!]?.name}:</span>
            <Highlighted text={text!} marks={marks} active={active} />
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
    <Card className="mb-6" data-testid="summary" lang="vi">
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Số câu đúng</p>
            <p className="text-3xl font-bold tabular-nums">
              {correct}/{results.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Band ước lượng</p>
            <p className="text-3xl font-bold tabular-nums">{band === null ? '—' : fmtBand(band)}</p>
            {band === null ? (
              <p className="text-xs text-muted-foreground">chỉ tính cho cả bài 40 câu</p>
            ) : (
              target !== null &&
              correct < target && (
                <p className="text-xs text-muted-foreground">
                  cần {target - correct} câu nữa để đạt {fmtBand(goal.band)}
                </p>
              )
            )}
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
              <Link to={`/ielts/${test.skill}`}>Chọn đề khác</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Bấm số câu ở thanh dưới, hoặc “Xem chỗ có đáp án trong bài” dưới mỗi câu, để thấy câu chứa đáp án được tô màu.</p>
        </div>
      </CardContent>
    </Card>
  );
}
