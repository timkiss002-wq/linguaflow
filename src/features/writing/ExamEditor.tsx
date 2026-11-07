import { Clock, Send, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toUserMessage } from '@/lib/errors';
import { splitWords } from '@/lib/vocab/words';
import { analyze } from '@/lib/writing/analyze';
import { TASK_RULES, guidedForTask, visiblePrompt } from '@/lib/writing/guided';
import type { WritingTask } from '@/lib/writing/tasks';
import { cn } from '@/lib/utils';
import { useSaveSubmission, useWritingProfile } from './api';
import { TaskChart } from './guided/TaskChart';

/** IELTS Writing under exam conditions (Task 1: 20 minutes, Task 2: 40), no help, saved automatically when time is up. */
const taskNumber = (task: WritingTask): 1 | 2 => (task.min_length <= TASK_RULES[1].words ? 1 : 2);
const minutesFor = (task: WritingTask) => TASK_RULES[taskNumber(task)].minutes;

interface ExamDraft {
  body: string;
  /** epoch ms: the clock keeps running across reloads, as in a real exam */
  startedAt: number;
}
const key = (taskId: string) => `writing-exam:${taskId}`;
function readExam(taskId: string): ExamDraft | null {
  try {
    const raw = localStorage.getItem(key(taskId));
    return raw ? (JSON.parse(raw) as ExamDraft) : null;
  } catch {
    return null;
  }
}
function writeExam(taskId: string, d: ExamDraft | null) {
  try {
    if (d) localStorage.setItem(key(taskId), JSON.stringify(d));
    else localStorage.removeItem(key(taskId));
  } catch {
    /* private mode */
  }
}

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`;

export function ExamEditor({ task }: { task: WritingTask }) {
  const EXAM_MINUTES = minutesFor(task);
  const [draft, setDraft] = useState<ExamDraft | null>(() => readExam(task.id));
  const back = (
    <Link to="/writing?lang=en" className="hover:underline">
      ← English prompts
    </Link>
  );
  if (!draft)
    return (
      <>
        <PageHeader title={task.title} description={back} />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-5 text-rose-600" aria-hidden /> Thi thử IELTS Writing Task {taskNumber(task)}
            </CardTitle>
            <CardDescription>Như trong phòng thi: viết một mình, hết giờ là nộp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                <b>{EXAM_MINUTES} phút</b>, đồng hồ vẫn chạy nếu bạn rời trang hoặc tải lại.
              </li>
              <li>
                Ít nhất <b>{task.min_length} từ</b>. Không có gợi ý, bản dịch hay khung bài.
              </li>
              <li>Hết giờ bài được nộp tự động; sau đó AI chấm band theo 4 tiêu chí và chỉ ra từng lỗi.</li>
              <li>{taskNumber(task) === 1 ? 'Mẹo phân bổ: 3 phút đọc biểu đồ, tìm 2 đặc điểm chính · 14 phút viết · 3 phút soát lỗi.' : 'Mẹo phân bổ: 5 phút lập dàn ý · 30 phút viết · 5 phút soát lỗi.'}</li>
            </ul>
            <Button
              size="lg"
              onClick={() => {
                const d = { body: '', startedAt: Date.now() };
                writeExam(task.id, d);
                setDraft(d);
              }}
              data-testid="exam-start"
            >
              <Clock className="size-4" /> Bắt đầu — {EXAM_MINUTES}:00
            </Button>
          </CardContent>
        </Card>
      </>
    );
  return <Writing task={task} draft={draft} back={back} />;
}

function Writing({ task, draft, back }: { task: WritingTask; draft: ExamDraft; back: React.ReactNode }) {
  const EXAM_MINUTES = minutesFor(task);
  const chart = guidedForTask(task.id)?.chart;
  const navigate = useNavigate();
  const save = useSaveSubmission();
  const profile = useWritingProfile('en');
  const [body, setBody] = useState(draft.body);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  const warned = useRef<Set<number>>(new Set());
  const limit = EXAM_MINUTES * 60;
  const elapsed = Math.min(limit, Math.floor((now - draft.startedAt) / 1000));
  const left = limit - elapsed;
  const timeUp = left <= 0;
  const words = splitWords(body, 'en').filter((s) => s.isWord).length;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => writeExam(task.id, { ...draft, body }), 300);
    return () => clearTimeout(id);
  }, [body, draft, task.id]);
  useEffect(() => {
    for (const m of [10, 5, 1])
      if (left <= m * 60 && left > 0 && !warned.current.has(m)) {
        warned.current.add(m);
        toast.warning(`Còn ${m} phút`);
      }
  }, [left]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submitted.current) return;
      if (!body.trim()) {
        if (auto) {
          writeExam(task.id, null);
          toast.error('Hết giờ — bài trống nên không được lưu.');
          navigate('/writing?lang=en');
        }
        return;
      }
      submitted.current = true;
      setBusy(true);
      try {
        const metrics = analyze(body, { language: 'en', kind: task.kind, minLength: task.min_length, targets: [], level: profile?.level.value, seconds: elapsed });
        const id = await save.mutateAsync({
          language: 'en',
          taskId: task.id,
          title: `${task.title} — exam (${EXAM_MINUTES} min)`,
          prompt: task.prompt,
          targets: [],
          body: body.trim(),
          metrics: { ...metrics, exam: { minutes: EXAM_MINUTES, timeUp: auto } },
          seconds: elapsed,
        });
        writeExam(task.id, null);
        navigate(`/writing/${id}?exam=1`);
      } catch (e) {
        submitted.current = false;
        toast.error(toUserMessage(e));
        setBusy(false);
      }
    },
    [body, elapsed, navigate, profile?.level.value, save, task, EXAM_MINUTES],
  );

  useEffect(() => {
    if (timeUp) void submit(true);
  }, [timeUp, submit]);

  return (
    <>
      <PageHeader title={task.title} description={back} />
      <div className="sticky top-0 z-10 -mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur">
        <span
          className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-lg tabular-nums', left < 300 ? 'border-destructive text-destructive' : left < 600 ? 'border-warning text-warning' : '')}
          data-testid="exam-timer"
        >
          <Clock className="size-4" aria-hidden /> {clock(left)}
        </span>
        <span className={cn('text-sm tabular-nums', words >= task.min_length ? 'text-success' : 'text-muted-foreground')} data-testid="length">
          {words} / {task.min_length}+ words
        </span>
        <Button onClick={() => (words < task.min_length && !window.confirm(`Bài mới có ${words} từ (cần ${task.min_length}). Vẫn nộp?`) ? null : void submit(false))} disabled={busy || !body.trim()}>
          <Send className="size-4" /> {busy ? 'Đang nộp…' : 'Nộp bài'}
        </Button>
      </div>
      <Card className="mb-3">
        <CardContent className="pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Writing Task {taskNumber(task)} · You should spend about {EXAM_MINUTES} minutes on this task.
          </p>
          <p className="mt-1 font-medium" lang="en" data-testid="task-prompt">
            {visiblePrompt(task.prompt)}
          </p>
          {taskNumber(task) === 2 && <p className="mt-1 text-sm text-muted-foreground">Give reasons for your answer and include any relevant examples from your own knowledge or experience.</p>}
          <p className="mt-1 text-sm text-muted-foreground">Write at least {task.min_length} words.</p>
          {chart && (
            <div className="mt-3 rounded-md border p-3">
              <TaskChart chart={chart} />
            </div>
          )}
        </CardContent>
      </Card>
      <label htmlFor="exam-body" className="sr-only">
        Your essay
      </label>
      <textarea
        id="exam-body"
        value={body}
        readOnly={timeUp || busy}
        onChange={(e) => setBody(e.target.value)}
        rows={20}
        maxLength={20000}
        lang="en"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        placeholder="Write your essay here…"
        className="w-full rounded-md border bg-card p-4 leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="mt-1 text-xs text-muted-foreground">Kiểm tra chính tả của trình duyệt đã tắt, như khi thi trên máy tính.</p>
    </>
  );
}
