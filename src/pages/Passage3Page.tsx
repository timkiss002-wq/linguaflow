import { BookMarked, BookOpen, CheckCircle2, Copy, Download, Flame, Headphones, HelpCircle, NotebookPen, PenLine, Plus, Shuffle, Upload } from 'lucide-react';
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CoverArt } from '@/features/passage3/CoverArt';
import { useP3Store } from '@/features/passage3/useP3Store';
import { activeDays, dailyDone, dailyVersion, dayKey, pickForDay, subscribeDaily, type DailyTask } from '@/lib/daily';
import {
  CAM_BOOKS,
  CAM_INDEX,
  OWN_SETS,
  TYPE_INFO,
  exportBackup,
  getImports,
  getProgress,
  importBackup,
  importFor,
  nextSet,
  notebook,
  setSummary,
  streak,
  today,
  type P3Set,
  type P3Type,
} from '@/lib/ielts/passage3';
import { LISTENING_PART1 } from '@/lib/ielts/tests';
import { GUIDED_PROMPTS } from '@/lib/writing/guided';
import { cn } from '@/lib/utils';

type Tab = 'sets' | 'cambridge' | 'notes';
type Pick = 'A' | 'B' | 'cam';

const PICKS: { id: Pick; label: string }[] = [
  { id: 'A', label: 'T/F/NG · MCQ' },
  { id: 'B', label: 'Gap-filling' },
  { id: 'cam', label: 'Cambridge' },
];

/** IELTS Writing prompts only (Task 1 and Task 2 with a frame). */
const WRITING_POOL = GUIDED_PROMPTS;

/**
 * /ielts/passage3 — "Bài tập hằng ngày": three tasks for today (Reading Passage 3, one Writing prompt, one Listening
 * Part 1), then the reading library in three tabs (ready-made sets · Cambridge 10–20 · paraphrase notebook).
 */
export default function Passage3Page() {
  useP3Store();
  useSyncExternalStore(subscribeDaily, dailyVersion);
  const [params, setParams] = useSearchParams();
  const tab = (['sets', 'cambridge', 'notes'].includes(params.get('tab') ?? '') ? params.get('tab') : 'sets') as Tab;
  const setTab = (t: Tab) => setParams(t === 'sets' ? {} : { tab: t }, { replace: true });
  const p = getProgress();
  const notes = notebook();
  const done = dailyDone();
  const days = [...new Set([...p.days, ...activeDays()])];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bài tập hằng ngày</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Mỗi ngày ba việc nhỏ: 4–5 câu Reading Passage 3, một đề Writing và một bài Listening Part 1. Hôm nay xong <b className="text-foreground">{done.length}/3</b>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm" title="Số ngày luyện liên tiếp">
            <Flame className={cn('size-4', done.length ? 'text-orange-500' : 'text-muted-foreground')} aria-hidden />
            <b>{streak(days)}</b> ngày
          </span>
          <HowTo />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReadingToday done={done.includes('reading')} />
        <WritingToday done={done.includes('writing')} />
        <ListeningToday done={done.includes('listening')} />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold tracking-tight">Thư viện Reading Passage 3</h2>
        <div role="tablist" className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b px-1">
          <TabButton on={tab === 'sets'} onClick={() => setTab('sets')}>
            Bài soạn sẵn <Count n={OWN_SETS.length} />
          </TabButton>
          <TabButton on={tab === 'cambridge'} onClick={() => setTab('cambridge')}>
            Cambridge 10–20 <Count n={getImports().filter((s) => s.camId).length} of={CAM_INDEX.length} />
          </TabButton>
          <TabButton on={tab === 'notes'} onClick={() => setTab('notes')}>
            Sổ paraphrase <Count n={notes.length} />
          </TabButton>
        </div>
        {tab === 'sets' && <OwnSets />}
        {tab === 'cambridge' && <Cambridge />}
        {tab === 'notes' && <Notes />}
      </div>
    </div>
  );
}

function TabButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn(
        '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
        on ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

const Count = ({ n, of }: { n: number; of?: number }) => (
  <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
    {n}
    {of !== undefined && `/${of}`}
  </span>
);

function TaskCard({ icon: Icon, label, done, children }: { icon: typeof BookOpen; label: string; done: boolean; children: ReactNode }) {
  return (
    <section className={cn('flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm', done && 'border-emerald-300 dark:border-emerald-500/40')} aria-label={label}>
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Icon className="size-4 text-primary" aria-hidden />
        <span className="text-sm font-semibold">{label}</span>
        {done ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" aria-hidden /> Xong hôm nay
          </span>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">Chưa làm</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>
    </section>
  );
}

const PICK_KEY = 'lf.p3daily.pick';
const SHIFT_KEY = 'lf.daily.shift';

/** "Đổi bài khác": how many times today's pick was skipped, per task (resets each day). */
function useShift(task: DailyTask) {
  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(SHIFT_KEY) ?? '{}') as {
        day?: string;
      } & Record<string, number>;
      return v.day === dayKey() ? (v[task] ?? 0) : 0;
    } catch {
      return 0;
    }
  };
  const [shift, setShift] = useState(read);
  const next = () => {
    const n = shift + 1;
    setShift(n);
    try {
      const v = JSON.parse(localStorage.getItem(SHIFT_KEY) ?? '{}') as Record<string, unknown>;
      localStorage.setItem(
        SHIFT_KEY,
        JSON.stringify({
          ...(v.day === dayKey() ? v : {}),
          day: dayKey(),
          [task]: n,
        }),
      );
    } catch {
      /* private mode */
    }
  };
  return [shift, next] as const;
}

function ReadingToday({ done }: { done: boolean }) {
  const [pick, setPickState] = useState<Pick>(() => {
    try {
      return (localStorage.getItem(PICK_KEY) as Pick) || 'A';
    } catch {
      return 'A';
    }
  });
  const setPick = (v: Pick) => {
    setPickState(v);
    try {
      localStorage.setItem(PICK_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const set = nextSet(pick);
  const fin = set ? getProgress().done[set.id] : undefined;
  const sum = set ? setSummary(set) : null;
  return (
    <TaskCard icon={BookOpen} label="Reading · Passage 3" done={done}>
      <div className="grid grid-cols-3 rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Dạng bài">
        {PICKS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={pick === o.id}
            onClick={() => setPick(o.id)}
            className={cn('whitespace-nowrap rounded-md px-1.5 py-1 text-xs font-medium transition', pick === o.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {set ? (
        <>
          <div className="flex gap-3">
            <CoverArt id={set.id} art={set.art} className="h-16 w-20 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold leading-snug">{set.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {TYPE_INFO[set.type].short} · {set.items.length} câu · {fin ? `ôn lại (${fin.score}/${fin.total})` : sum && sum.checked ? `đang làm ${sum.checked}/${set.items.length}` : 'bài mới'}
              </p>
            </div>
          </div>
          <Button asChild className="mt-auto" data-start>
            <Link to={`/ielts/passage3/${set.id}`}>{sum && sum.checked > 0 && !fin ? 'Làm tiếp' : 'Bắt đầu'}</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Chưa có đề Cambridge nào. Mở sách, dán Passage 3 và 4–5 câu hỏi là luyện được.</p>
          <Button asChild variant="outline" className="mt-auto">
            <Link to="/ielts/passage3?tab=cambridge">Chọn đề Cambridge</Link>
          </Button>
        </>
      )}
    </TaskCard>
  );
}

function WritingToday({ done }: { done: boolean }) {
  const [shift, next] = useShift('writing');
  const prompt = pickForDay(WRITING_POOL, 'writing', shift);
  if (!prompt) return null;
  const task1 = !!prompt.chart;
  return (
    <TaskCard icon={PenLine} label={`Writing · ${task1 ? 'Task 1' : 'Task 2'}`} done={done}>
      <div>
        <p className="font-semibold leading-snug">{prompt.title}</p>
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground" lang="en">
          {prompt.prompt}
        </p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button asChild className="flex-1">
          <Link to={`/writing/guided/${prompt.id}`}>Viết theo khung</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link to={`/writing/new/${prompt.task}`}>Viết tự do</Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={next} aria-label="Đổi đề khác" title="Đổi đề khác">
          <Shuffle />
        </Button>
      </div>
    </TaskCard>
  );
}

function ListeningToday({ done }: { done: boolean }) {
  const [shift, next] = useShift('listening');
  const pick = pickForDay(LISTENING_PART1, 'listening', shift);
  if (!pick) return null;
  return (
    <TaskCard icon={Headphones} label="Listening · Part 1" done={done}>
      <div>
        <p className="font-semibold leading-snug">{pick.part.heading}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{pick.part.context}</p>
        <p className="mt-1 text-xs text-muted-foreground">10 câu điền từ · từ khóa được đọc nhấn rõ · nghe lại từng câu sau khi nộp</p>
      </div>
      <div className="mt-auto flex gap-2">
        <Button asChild className="flex-1">
          <Link to={`/ielts/${pick.test.id}?parts=${pick.part.id}&mode=practice`}>Bắt đầu nghe</Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={next} aria-label="Đổi bài khác" title="Đổi bài khác">
          <Shuffle />
        </Button>
      </div>
    </TaskCard>
  );
}

function SetCard({ set }: { set: P3Set }) {
  const d = getProgress().done[set.id];
  const sum = setSummary(set);
  return (
    <Link to={`/ielts/passage3/${set.id}`} className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" data-set={set.id}>
      <div className="relative">
        <CoverArt id={set.id} art={set.art} className="aspect-[4/3] w-full" />
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">{TYPE_INFO[set.type].short}</span>
        {d ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <CheckCircle2 className="size-3" aria-hidden /> {d.score}/{d.total}
          </span>
        ) : sum.checked ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
            {sum.checked}/{set.items.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{set.title}</span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{set.topic}</span>
      </div>
    </Link>
  );
}

/** cards shown before "Xem thêm" (three rows on a wide screen) */
const PAGE = 15;

type TypeFilter = 'all' | P3Type;
type StatusFilter = 'all' | 'todo' | 'done';

function OwnSets() {
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [shown, setShown] = useState(PAGE);
  const p = getProgress();
  const list = OWN_SETS.filter((s) => (type === 'all' || s.type === type) && (status === 'all' || (status === 'done') === !!p.done[s.id]));
  const chip = (on: boolean) => cn('rounded-full border px-3 py-1 text-xs font-medium transition', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {(['all', 'tfng', 'ynng', 'mcq', 'gap'] as TypeFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            className={chip(type === t)}
            onClick={() => {
              setType(t);
              setShown(PAGE);
            }}
            aria-pressed={type === t}
          >
            {t === 'all' ? 'Tất cả dạng' : TYPE_INFO[t].short} <span className="opacity-70">{t === 'all' ? OWN_SETS.length : OWN_SETS.filter((s) => s.type === t).length}</span>
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {(
          [
            ['all', 'Tất cả'],
            ['todo', 'Chưa làm'],
            ['done', 'Đã làm'],
          ] as [StatusFilter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={chip(status === k)}
            onClick={() => {
              setStatus(k);
              setShown(PAGE);
            }}
            aria-pressed={status === k}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.slice(0, shown).map((s) => (
            <SetCard key={s.id} set={s} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Không có bài nào khớp bộ lọc.</p>
      )}
      {list.length > shown && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)} data-more>
            Xem thêm ({list.length - shown} bài)
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Bài soạn riêng cho LinguaFlow theo độ khó Passage 3, có key cho từng cặp từ và giải thích tiếng Việt.</p>
    </div>
  );
}

function SetRow({ set }: { set: P3Set }) {
  const d = getProgress().done[set.id];
  const sum = setSummary(set);
  return (
    <Link to={`/ielts/passage3/${set.id}`} className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition hover:border-primary/40 hover:shadow-sm" data-set={set.id}>
      <span className="w-14 shrink-0 rounded-md bg-muted py-0.5 text-center text-[11px] font-bold text-muted-foreground">{TYPE_INFO[set.type].short}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium group-hover:text-primary">{set.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{set.topic}</span>
      </span>
      {d ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" aria-hidden /> {d.score}/{d.total}
        </span>
      ) : sum.checked ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {sum.checked}/{set.items.length}
        </span>
      ) : null}
    </Link>
  );
}

function Cambridge() {
  const [book, setBook] = useState<number>(() => {
    // the book last worked on, else the newest book whose titles are all listed
    const last = getImports()
      .filter((s) => s.camId)
      .pop();
    const fromLast = CAM_INDEX.find((c) => c.id === last?.camId)?.book;
    return fromLast ?? [...CAM_BOOKS].reverse().find((b) => CAM_INDEX.filter((c) => c.book === b).every((c) => c.title)) ?? 20;
  });
  const file = useRef<HTMLInputElement>(null);
  const others = getImports().filter((s) => !s.camId);

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `linguaflow-passage3-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const n = importBackup(await f.text());
      toast.success(`Đã khôi phục ${n} đề.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đọc được file.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Chọn sách">
        {CAM_BOOKS.map((b) => {
          const n = CAM_INDEX.filter((c) => c.book === b && importFor(c.id)).length;
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={book === b}
              onClick={() => setBook(b)}
              className={cn(
                'relative rounded-lg border px-3 py-1.5 text-sm font-semibold transition',
                book === b ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
              )}
            >
              Cam {b}
              {n > 0 && (
                <span
                  className={cn('ml-1.5 rounded-full px-1.5 text-[10px]', book === b ? 'bg-primary-foreground/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200')}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {CAM_INDEX.filter((c) => c.book === book).map((c) => {
          const mine = importFor(c.id);
          const d = mine ? getProgress().done[mine.id] : undefined;
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-cam={c.id}>
              <span className="w-16 shrink-0 text-sm font-semibold">Test {c.test}</span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm', !(mine?.title ?? c.title) && 'italic text-muted-foreground')}>{mine?.title ?? c.title ?? 'Tên bài: điền khi nhập'}</span>
                {mine && (
                  <span className="text-xs text-muted-foreground">
                    {TYPE_INFO[mine.type].short} · {mine.items.length} câu
                    {d ? ` · ${d.score}/${d.total}` : ''}
                  </span>
                )}
              </span>
              {mine ? (
                <span className="flex gap-1.5">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/ielts/passage3/edit/${c.id}`}>Sửa</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to={`/ielts/passage3/${mine.id}`}>Luyện</Link>
                  </Button>
                </span>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/ielts/passage3/edit/${c.id}`}>
                    <Plus /> Nhập đề
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {others.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Đề khác bạn đã nhập</h2>
          <div className="space-y-2">
            {others.map((s) => (
              <SetRow key={s.id} set={s} />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
        <p className="mr-auto max-w-xl text-xs text-muted-foreground">
          Đề Cambridge có bản quyền nên LinguaFlow không lưu sẵn nội dung — bạn dán từ sách của mình, và đề chỉ nằm trên trình duyệt này. Dùng sao lưu để chuyển sang máy khác.
        </p>
        <Button asChild size="sm" variant="ghost">
          <Link to="/ielts/passage3/edit/new">
            <Plus /> Đề khác
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={download}>
          <Download /> Sao lưu
        </Button>
        <Button size="sm" variant="ghost" onClick={() => file.current?.click()}>
          <Upload /> Khôi phục
        </Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function Notes() {
  const rows = notebook();
  if (!rows.length)
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
        <NotebookPen className="size-6" aria-hidden />
        Làm xong một bài, các cặp từ đồng nghĩa (từ trong câu hỏi ⇄ từ trong bài) sẽ được gom vào đây. Cặp bạn ghép sai nằm trên cùng.
      </div>
    );
  const copy = async () => {
    const text = rows.map((r) => [r.question, r.passage, r.vi].join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã sao chép — dán vào Excel hoặc Anki.');
    } catch {
      toast.error('Trình duyệt không cho sao chép.');
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} cặp · <span className="text-rose-600 dark:text-rose-400">{rows.filter((r) => r.missed).length} cặp bạn ghép sai</span>
        </p>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy /> Sao chép
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Trong câu hỏi</th>
              <th className="px-3 py-2">Trong passage</th>
              <th className="px-3 py-2">Nghĩa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, k) => (
              <tr key={k} className={cn(r.missed && 'bg-rose-50/60 dark:bg-rose-500/5')}>
                <td className={cn('px-3 py-2', r.missed && 'border-l-4 border-rose-400')} lang="en">
                  {r.question}
                </td>
                <td className="px-3 py-2 font-medium" lang="en">
                  {r.passage}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.vi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HowTo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle /> Cách làm
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <BookMarked className="size-5" aria-hidden /> Cách làm bài tập hằng ngày
        </DialogTitle>
        <DialogDescription asChild>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            <li>
              <b>Cặp hiển nhiên</b> (tên riêng, số, từ lặp lại) đã được tô sẵn — dùng chúng để tìm đúng chỗ trong bài.
            </li>
            <li>
              <b>Từ khóa có dấu ?</b> là từ đã bị paraphrase. Bấm vào nó, rồi bấm (các) từ cùng nghĩa trong passage.
            </li>
            <li>
              Không tìm thấy cặp → bấm <b>∅ Không có trong bài</b>: dấu hiệu của <b>NOT GIVEN</b>. Cảnh giác với <i>first, only, all, most, never, more…than</i>.
            </li>
            <li>
              Cặp mang nghĩa <b>ngược</b> (indispensable ⇄ play no part) → <b>FALSE / NO</b>. Mọi cặp đều cùng nghĩa → <b>TRUE / YES</b>.
            </li>
            <li>
              <b>Writing</b>: mỗi ngày một đề ngẫu nhiên — chọn <i>Viết theo khung</i> nếu muốn có câu gợi ý từng bước. <b>Listening Part 1</b>: từ khóa được đọc chậm và rõ hơn; nộp bài xong có thể
              bấm ▶ để nghe lại từng câu.
            </li>
            <li>
              <b>Gap-filling</b>: chỗ trống cũng là một từ khóa — tìm cụm trong bài trước, rồi mới chọn từ trong word box có cùng nghĩa. Word box luôn có bẫy: từ trái nghĩa, hoặc từ có trong bài nhưng
              ở ý khác.
            </li>
          </ol>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
