import {
  BookA,
  Blocks,
  BookOpen,
  BookOpenCheck,
  ListChecks,
  MessagesSquare,
  BookText,
  Link2,
  Scale,
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
  Wrench,
  type LucideIcon,
  Shapes,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { useImportWords } from '@/features/vocabulary/api';
import { topicById } from '@/lib/grammar/drills';
import { practiceOf } from '@/lib/practice/results';
import { activeWordsOf, wordsOf, type Day, type Task, type TaskKind } from '@/lib/roadmap/plan';
import { hrefFor, isDone, lockReason, setManualDone, topicState, type Context } from '@/lib/roadmap/progress';
import { TONE, type Tone } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';

const ICON: Record<TaskKind, LucideIcon> = {
  placement: ClipboardCheck,
  setup: Target,
  'grammar-learn': Languages,
  'grammar-drill': Languages,
  'grammar-own': PenLine,
  'grammar-review': Repeat,
  'grammar-fix': Wrench,
  'grammar-svo': Blocks,
  'vocab-new': BookA,
  'vocab-active': PenLine,
  'vocab-translate': Languages,
  'vocab-review': Layers,
  'wordform-week': Shapes,
  'writing-week': PenLine,
  'reading-p3': BookOpen,
  'grammar-mcq': ListChecks,
  'reading-tfng': BookOpenCheck,
  'translate-dialogue': MessagesSquare,
  'translate-story': BookText,
  'grammar-weak': Repeat,
  linking: Link2,
  argue: Scale,
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
  'grammar-fix': 'Ngữ pháp · sửa lỗi',
  'grammar-svo': 'Ngữ pháp · cấu trúc câu',
  'vocab-new': 'Từ vựng thụ động · Reading',
  'vocab-active': 'Từ vựng chủ động · Writing',
  'vocab-translate': 'Từ vựng · dịch ví dụ',
  'vocab-review': 'Từ vựng',
  'wordform-week': 'Writing · word form',
  'writing-week': 'Writing · đoạn văn tuần',
  'reading-p3': 'Reading',
  'grammar-mcq': 'Ngữ pháp · trắc nghiệm',
  'reading-tfng': 'Reading · True / False / Not Given',
  'translate-dialogue': 'Dịch · hội thoại',
  'translate-story': 'Dịch · truyện ngắn',
  'grammar-weak': 'Ngữ pháp · ôn theo lỗi',
  linking: 'Writing · từ nối',
  argue: 'Writing · lập luận',
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

/** One colour per skill on the task's icon tile, so the day's mix (grammar, words, reading, writing) reads at a glance. */
function toneOf(kind: TaskKind): Tone {
  if (kind.startsWith('grammar')) return 'sky';
  if (kind.startsWith('vocab') || kind === 'wordform-week') return 'teal';
  if (kind.startsWith('reading')) return 'violet';
  if (kind.startsWith('writing') || kind.startsWith('translate') || kind === 'linking' || kind === 'argue') return 'rose';
  if (kind.startsWith('mock') || kind === 'placement' || kind === 'retest') return 'amber';
  return 'slate';
}

/** Tasks that only the exercise itself can tick (grammar ≥ 50 %, retest saved…). */
const AUTO_ONLY: TaskKind[] = ['grammar-learn', 'grammar-drill', 'vocab-active', 'vocab-translate', 'grammar-fix', 'grammar-svo', 'wordform-week', 'writing-week', 'placement', 'retest', 'rest', 'grammar-mcq', 'reading-tfng', 'translate-dialogue', 'translate-story', 'grammar-weak', 'linking', 'argue'];

const PRACTICE_KINDS: TaskKind[] = ['vocab-translate', 'grammar-fix', 'grammar-svo', 'wordform-week', 'writing-week', 'grammar-mcq', 'reading-tfng', 'translate-dialogue', 'translate-story', 'grammar-weak', 'linking', 'argue'];

/**
 * `nextId`: the one task to do next. When given, only that card gets the filled button and the other open tasks get
 * outline buttons, so a page of ten tasks has a single obvious place to start.
 */
export function DayTasks({ day, ctx, compact, nextId }: { day: Day; ctx: Context; compact?: boolean; nextId?: string }) {
  return (
    <ul className="space-y-2.5" aria-label={`Việc ngày ${day.date}`}>
      {day.tasks.map((t) => (
        <li key={t.id}>
          <TaskCard task={t} day={day} ctx={ctx} compact={compact} emphasis={nextId === undefined ? undefined : nextId === t.id ? 'next' : 'quiet'} />
        </li>
      ))}
    </ul>
  );
}

export function TaskCard({ task, day, ctx, compact, showDate, emphasis }: { task: Task; day: Day; ctx: Context; compact?: boolean; showDate?: string; emphasis?: 'next' | 'quiet' }) {
  const done = isDone(task, ctx);
  const lock = lockReason(task, day, ctx);
  const next = emphasis === 'next' && !done && !lock;
  const Icon = ICON[task.kind];
  const topic = task.topic ? topicById(task.topic) : undefined;
  const ts = task.topic ? topicState(task.topic) : undefined;
  const [open, setOpen] = useState(false);
  const rest = task.kind === 'rest';

  return (
    <div
      className={cn('rounded-xl border bg-card p-4', done && !rest && 'border-success/40 bg-success/5', lock && !done && 'bg-muted/40', next && 'border-primary/50 shadow-soft ring-1 ring-primary/30')}
      data-task={task.kind}
      data-next={next || undefined}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl', done ? 'bg-success/15 text-success' : lock ? 'bg-muted text-muted-foreground' : TONE[toneOf(task.kind)].tile)}>
          {lock && !done ? <Lock className="size-4" aria-hidden /> : <Icon className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {next && <span className="mr-1.5 rounded bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">Làm tiếp</span>}
            {showDate && <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{showDate}</span>}
            {AREA[task.kind]}
            {task.minutes > 0 && ` · ${task.minutes} phút`}
          </p>
          <p className={cn('font-semibold leading-snug', done && !rest && 'text-muted-foreground')}>
            {task.title}
            {topic && <span className="font-normal text-muted-foreground"> — {topic.title_vi}</span>}
          </p>
          {!compact && !(lock && !done) && <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>}
          {ts && (task.kind === 'grammar-learn' || task.kind === 'grammar-drill') && (
            <p className="mt-1 text-xs text-muted-foreground">
              Nhận diện: {ts.quiz ? `${ts.quiz.best}/${ts.quiz.total}` : 'chưa làm'} · Dịch câu: {ts.drill ? `${ts.drill.best}/${ts.drill.total}` : 'chưa làm'}
            </p>
          )}
          {PRACTICE_KINDS.includes(task.kind) && practiceOf(task.id) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Điểm cao nhất: {practiceOf(task.id)!.best}/{practiceOf(task.id)!.total}
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
            {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-input" />}
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

      {task.kind === 'vocab-active' && (
        <div className="mt-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline" aria-expanded={open}>
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden /> {open ? 'Ẩn các cụm từ' : `Xem ${activeWordsOf(task).length} cụm từ`}
          </button>
          {open && (
            <ul className="mt-2 divide-y overflow-hidden rounded-lg border text-sm">
              {activeWordsOf(task).map((w) => (
                <li key={w.t} className="px-3 py-1.5">
                  <span className="font-medium" lang="en">
                    {w.t}
                  </span>
                  <span className="text-muted-foreground"> — {w.m}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!rest && !lock && (task.href || !AUTO_ONLY.includes(task.kind)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
          {task.href && !lock && (
            <Button size="sm" asChild variant={done || emphasis === 'quiet' ? 'outline' : 'default'}>
              <Link to={hrefFor(task)!}>{task.kind === 'vocab-active' ? (done ? 'Xem / sửa câu' : 'Học cụm & viết câu') : done ? 'Làm lại' : task.kind === 'vocab-new' ? 'Mở Sổ từ' : 'Bắt đầu'}</Link>
            </Button>
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
