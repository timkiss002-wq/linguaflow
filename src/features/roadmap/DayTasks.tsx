import {
  BookA,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Coffee,
  FileText,
  Languages,
  Layers,
  Lock,
  NotebookPen,
  PenLine,
  Plus,
  Repeat,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { useImportWords } from '@/features/vocabulary/api';
import { topicById } from '@/lib/grammar/drills';
import { wordsOf, type Day, type Task, type TaskKind } from '@/lib/roadmap/plan';
import { isDone, lockReason, setManualDone, topicState, type Context } from '@/lib/roadmap/progress';
import { cn } from '@/lib/utils';

const ICON: Record<TaskKind, LucideIcon> = {
  placement: ClipboardCheck,
  setup: Target,
  'grammar-learn': Languages,
  'grammar-drill': Languages,
  'grammar-own': PenLine,
  'grammar-review': Repeat,
  'vocab-new': BookA,
  'vocab-review': Layers,
  'reading-p3': BookOpen,
  'reading-skill': BookOpen,
  'reading-part': BookOpen,
  'writing-frame': PenLine,
  'writing-guided': PenLine,
  'writing-exam': FileText,
  'writing-paragraph': PenLine,
  'writing-mistakes': NotebookPen,
  'mock-reading': FileText,
  'mock-paper': FileText,
  'mock-review': NotebookPen,
  'week-review': Repeat,
  retest: ClipboardCheck,
  rest: Coffee,
};

export const AREA: Record<TaskKind, string> = {
  placement: 'Kiểm tra',
  setup: 'Chuẩn bị',
  'grammar-learn': 'Ngữ pháp',
  'grammar-drill': 'Ngữ pháp',
  'grammar-own': 'Ngữ pháp',
  'grammar-review': 'Ngữ pháp',
  'vocab-new': 'Từ vựng',
  'vocab-review': 'Từ vựng',
  'reading-p3': 'Reading',
  'reading-skill': 'Reading',
  'reading-part': 'Reading',
  'writing-frame': 'Writing',
  'writing-guided': 'Writing',
  'writing-exam': 'Writing',
  'writing-paragraph': 'Writing',
  'writing-mistakes': 'Writing',
  'mock-reading': 'Thi thử',
  'mock-paper': 'Thi thử',
  'mock-review': 'Thi thử',
  'week-review': 'Ôn tập',
  retest: 'Kiểm tra',
  rest: 'Nghỉ',
};

/** Tasks that only the exercise itself can tick (grammar ≥ 80 %, retest saved…). */
const AUTO_ONLY: TaskKind[] = ['grammar-learn', 'grammar-drill', 'placement', 'retest', 'rest'];

function hrefFor(task: Task) {
  if (task.kind === 'grammar-drill') return `${task.href}?step=drill`;
  return task.href;
}

export function DayTasks({ day, ctx, compact }: { day: Day; ctx: Context; compact?: boolean }) {
  return (
    <ul className="space-y-2.5" aria-label={`Việc ngày ${day.date}`}>
      {day.tasks.map((t) => (
        <li key={t.id}>
          <TaskCard task={t} day={day} ctx={ctx} compact={compact} />
        </li>
      ))}
    </ul>
  );
}

export function TaskCard({ task, day, ctx, compact, showDate }: { task: Task; day: Day; ctx: Context; compact?: boolean; showDate?: string }) {
  const done = isDone(task, ctx);
  const lock = lockReason(task, day);
  const Icon = ICON[task.kind];
  const topic = task.topic ? topicById(task.topic) : undefined;
  const ts = task.topic ? topicState(task.topic) : undefined;
  const [open, setOpen] = useState(task.kind === 'vocab-new' && !compact && !done);
  const rest = task.kind === 'rest';

  return (
    <div className={cn('rounded-xl border bg-card p-4', done && !rest && 'border-success/40 bg-success/5', lock && 'opacity-80')} data-task={task.kind}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg', done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {showDate && <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{showDate}</span>}
            {AREA[task.kind]}
            {task.minutes > 0 && ` · ${task.minutes} phút`}
          </p>
          <p className={cn('font-semibold leading-snug', done && !rest && 'text-muted-foreground')}>
            {task.title}
            {topic && <span className="font-normal text-muted-foreground"> — {topic.title_vi}</span>}
          </p>
          {!compact && <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>}
          {ts && (task.kind === 'grammar-learn' || task.kind === 'grammar-drill') && (
            <p className="mt-1 text-xs text-muted-foreground">
              Nhận diện: {ts.quiz ? `${ts.quiz.best}/${ts.quiz.total}` : 'chưa làm'} · Dịch câu: {ts.drill ? `${ts.drill.best}/${ts.drill.total}` : 'chưa làm'}
            </p>
          )}
          {lock && !done && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Lock className="size-3.5" aria-hidden /> {lock}
            </p>
          )}
        </div>
        {!rest && (
          <span className="mt-1 shrink-0" aria-label={done ? 'đã xong' : 'chưa xong'}>
            {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-border" />}
          </span>
        )}
      </div>

      {task.kind === 'vocab-new' && (
        <div className="mt-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline" aria-expanded={open}>
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden /> {open ? 'Ẩn danh sách từ' : `Xem ${wordsOf(task).length} từ`}
          </button>
          {open && <WordList task={task} ctx={ctx} locked={Boolean(lock)} />}
        </div>
      )}

      {!rest && (task.href || !AUTO_ONLY.includes(task.kind)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
          {task.href && (
            lock ? (
              <Button size="sm" variant="outline" disabled>
                <Lock /> Chưa mở
              </Button>
            ) : (
              <Button size="sm" asChild variant={done ? 'outline' : 'default'}>
                <Link to={hrefFor(task)!}>{done ? 'Làm lại' : task.kind === 'vocab-new' ? 'Mở Sổ từ' : 'Bắt đầu'}</Link>
              </Button>
            )
          )}
          {!AUTO_ONLY.includes(task.kind) && !lock && (
            <Button size="sm" variant="ghost" onClick={() => setManualDone(task.id, !done)} aria-pressed={done}>
              <Check /> {done ? 'Bỏ đánh dấu' : 'Đánh dấu đã xong'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function WordList({ task, ctx, locked }: { task: Task; ctx: Context; locked: boolean }) {
  const words = wordsOf(task);
  const importWords = useImportWords();
  const states = words.map((w) => ctx.notebook?.(w.t));
  const missing = words.filter((_, i) => !states[i]?.inNotebook);
  const practised = states.filter((s) => s?.practised).length;
  const add = () =>
    importWords.mutate(
      {
        language: 'en',
        rows: missing.map((w) => ({ term: w.t, meaning_vi: w.m || null, topic: w.topic, part_of_speech: w.p ?? null, examples: w.ex ? [w.ex] : [], context_sentence: w.ex ?? null, reading: null })),
      },
      {
        onSuccess: (r) => toast.success(`Đã thêm ${r.inserted} từ vào Sổ từ${r.duplicates ? ` (${r.duplicates} từ đã có)` : ''}.`),
        onError: () => toast.error('Không thêm được từ. Thử lại sau.'),
      },
    );
  return (
    <div className="mt-2 space-y-2">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 font-medium">Từ</th>
              <th className="px-3 py-1.5 font-medium">Nghĩa</th>
              <th className="hidden px-3 py-1.5 font-medium md:table-cell">Ví dụ</th>
              <th className="w-10 px-2 py-1.5" aria-label="Trạng thái" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {words.map((w, i) => (
              <tr key={w.t}>
                <td className="px-3 py-1.5 align-top">
                  <span className="font-medium" lang="en">
                    {w.t}
                  </span>
                  {w.p && <PosBadge pos={w.p} className="ml-1.5" />}
                </td>
                <td className="px-3 py-1.5 align-top text-muted-foreground">{w.m}</td>
                <td className="hidden px-3 py-1.5 align-top text-muted-foreground md:table-cell" lang="en">
                  {w.ex}
                </td>
                <td className="px-2 py-1.5 text-center align-top">
                  {states[i]?.practised ? <CheckCircle2 className="inline size-4 text-success" aria-label="đã ôn" /> : states[i]?.inNotebook ? <Circle className="inline size-4 text-primary" aria-label="đã có trong Sổ từ, chưa ôn" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {ctx.notebook && (
          <span className="text-muted-foreground">
            Đã ôn {practised}/{words.length} · trong Sổ từ {words.length - missing.length}/{words.length}
          </span>
        )}
        {ctx.notebook && missing.length > 0 && !locked && (
          <Button size="sm" variant="outline" onClick={add} disabled={importWords.isPending}>
            <Plus /> Thêm {missing.length} từ vào Sổ từ
          </Button>
        )}
      </div>
    </div>
  );
}
