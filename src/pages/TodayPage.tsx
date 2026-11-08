import { ArrowRight, BookOpen, Check, CheckCircle2, Circle, Headphones, Layers, PenLine, RotateCcw, Shuffle } from 'lucide-react';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDueToday } from '@/features/dashboard/api';
import { CoverArt } from '@/features/passage3/CoverArt';
import { useP3Store } from '@/features/passage3/useP3Store';
import { dailyDone, dailyVersion, dayKey, pickForDay, subscribeDaily, type DailyTask } from '@/lib/daily';
import { OWN_SETS, TYPE_INFO, getImports, getProgress, nextSet, setSummary, type P3Set } from '@/lib/ielts/passage3';
import { LISTENING_PART1 } from '@/lib/ielts/tests';
import { GUIDED_PROMPTS } from '@/lib/writing/guided';
import { cn } from '@/lib/utils';

/**
 * /dashboard while studying English — "Hôm nay": today's three tasks on the left (Reading Passage 3, one Writing
 * prompt, one Listening Part 1), the selected task on the right so it can be read before starting.
 */

type Pick = 'A' | 'B' | 'cam';
const PICKS: { id: Pick; label: string }[] = [
  { id: 'A', label: 'T/F/NG · MCQ' },
  { id: 'B', label: 'Gap-filling' },
  { id: 'cam', label: 'Cambridge' },
];
const PICK_KEY = 'lf.p3daily.pick';
const SHIFT_KEY = 'lf.daily.shift';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

/** "Đổi bài khác": how many times today's pick was skipped, per task (resets each day). */
function useShift(task: DailyTask) {
  const read = () => {
    const v = readLocal<{ day?: string } & Record<string, number>>(SHIFT_KEY, {});
    return v.day === dayKey() ? (v[task] ?? 0) : 0;
  };
  const [shift, setShift] = useState(read);
  const next = () => {
    const n = shift + 1;
    setShift(n);
    const v = readLocal<Record<string, unknown>>(SHIFT_KEY, {});
    writeLocal(SHIFT_KEY, { ...(v.day === dayKey() ? v : {}), day: dayKey(), [task]: n });
  };
  return [shift, next] as const;
}

export default function TodayPage() {
  useP3Store();
  useSyncExternalStore(subscribeDaily, dailyVersion);
  const done = dailyDone();
  const due = useDueToday();

  const [pick, setPickState] = useState<Pick>(() => {
    const v = readLocal<string>(PICK_KEY, 'A');
    return v === 'B' || v === 'cam' ? v : 'A';
  });
  const setPick = (v: Pick) => {
    setPickState(v);
    writeLocal(PICK_KEY, v);
  };
  const [wShift, nextWriting] = useShift('writing');
  const [lShift, nextListening] = useShift('listening');

  const reading = nextSet(pick);
  const writing = pickForDay(GUIDED_PROMPTS, 'writing', wShift);
  const listening = pickForDay(LISTENING_PART1, 'listening', lShift);

  const order: DailyTask[] = ['reading', 'writing', 'listening'];
  const [selected, setSelected] = useState<DailyTask>(() => order.find((t) => !done.includes(t)) ?? 'reading');

  // the Passage 3 set left half-way, if any
  const resume = [...OWN_SETS, ...getImports()].find((s) => !getProgress().done[s.id] && setSummary(s).checked > 0);

  const items: { id: DailyTask; icon: typeof BookOpen; label: string; title: string }[] = [
    { id: 'reading', icon: BookOpen, label: 'Reading · Passage 3', title: reading?.title ?? 'Chọn đề Cambridge' },
    { id: 'writing', icon: PenLine, label: `Writing · ${writing?.chart ? 'Task 1' : 'Task 2'}`, title: writing?.title ?? '—' },
    { id: 'listening', icon: Headphones, label: 'Listening · Part 1', title: listening?.part.heading ?? '—' },
  ];
  const left = order.filter((t) => !done.includes(t)).length;
  const date = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hôm nay</h1>
          <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
            {date} · {left ? `còn ${left} việc` : 'đã xong cả 3 việc'}
          </p>
        </div>
        <Link to="/ielts/passage3" className="text-sm font-medium text-primary hover:underline">
          Thư viện Passage 3 →
        </Link>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-2" aria-label="Việc hôm nay">
            <div className="flex items-center gap-3 px-3 pb-2 pt-2">
              <h2 className="text-sm font-semibold">Việc hôm nay</h2>
              <div className="h-1.5 flex-1 rounded-full bg-muted" role="progressbar" aria-valuenow={3 - left} aria-valuemin={0} aria-valuemax={3} aria-label="Tiến độ hôm nay">
                <div className="h-1.5 rounded-full bg-success transition-[width] duration-300" style={{ width: `${((3 - left) / 3) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{3 - left}/3</span>
            </div>
            <ul className="space-y-0.5">
              {items.map((it) => {
                const on = selected === it.id;
                const ok = done.includes(it.id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(it.id)}
                      aria-current={on ? 'true' : undefined}
                      data-task={it.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'bg-accent' : 'hover:bg-muted',
                      )}
                    >
                      <it.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted-foreground">{it.label}</span>
                        <span className={cn('block truncate text-sm font-semibold', ok && 'text-muted-foreground')}>{it.title}</span>
                      </span>
                      {ok ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="đã xong" /> : <Circle className="size-5 shrink-0 text-border" aria-label="chưa làm" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {left === 0 && <p className="px-3 pb-2 pt-1 text-xs font-medium text-success">Xong cả 3 việc. Hẹn bạn ngày mai!</p>}
          </section>

          {resume && (
            <section className="rounded-xl border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RotateCcw className="size-3.5" aria-hidden /> Học tiếp chỗ đang dừng
              </p>
              <p className="mt-1 truncate text-sm font-semibold">{resume.title}</p>
              <p className="text-xs text-muted-foreground">
                {TYPE_INFO[resume.type].short} · đã làm {setSummary(resume).checked}/{resume.items.length} câu
              </p>
              <Link to={`/ielts/passage3/${resume.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Tiếp tục <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </section>
          )}

          <section className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="size-3.5" aria-hidden /> Từ cần ôn hôm nay
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{due ?? '—'}</p>
            <Link to="/review" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {due ? 'Ôn ngay' : 'Mở sổ từ'} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </section>
        </div>

        <section className="min-h-[420px] rounded-xl border bg-card p-6" aria-live="polite" data-testid="task-preview">
          {selected === 'reading' && <ReadingPreview set={reading} pick={pick} onPick={setPick} done={done.includes('reading')} />}
          {selected === 'writing' && writing && (
            <Preview label={items[1]!.label} title={writing.title} done={done.includes('writing')}>
              <div className="rounded-lg bg-muted p-4 text-[15px] leading-relaxed" lang="en">
                {writing.prompt}
              </div>
              <p className="text-sm text-muted-foreground">{writing.prompt_vi}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {writing.chart ? 'Task 1: mô tả số liệu, tối thiểu 150 từ · 20 phút' : 'Task 2: bài luận, tối thiểu 250 từ · 40 phút'}</li>
                <li>• Viết theo khung: có câu gợi ý từng đoạn, chấm lỗi ngay khi nộp</li>
              </ul>
              <Actions>
                <Button asChild>
                  <Link to={`/writing/guided/${writing.id}`}>Viết theo khung</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/writing/new/${writing.task}`}>Viết tự do</Link>
                </Button>
                <Button variant="ghost" className="ml-auto" onClick={nextWriting}>
                  <Shuffle /> Đổi đề
                </Button>
              </Actions>
            </Preview>
          )}
          {selected === 'listening' && listening && (
            <Preview label={items[2]!.label} title={listening.part.heading} done={done.includes('listening')}>
              <p className="text-[15px] text-muted-foreground">{listening.part.context}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• 10 câu điền từ, nghe giọng đọc của trình duyệt</li>
                <li>• Tên, con số và từ khóa được đọc chậm và rõ hơn (tắt được)</li>
                <li>• Nộp bài xong: xem transcript, nghe lại từng câu</li>
              </ul>
              <Actions>
                <Button asChild>
                  <Link to={`/ielts/${listening.test.id}?parts=${listening.part.id}&mode=practice`}>
                    <Headphones /> Bắt đầu nghe
                  </Link>
                </Button>
                <Button variant="ghost" className="ml-auto" onClick={nextListening}>
                  <Shuffle /> Đổi bài
                </Button>
              </Actions>
            </Preview>
          )}
        </section>
      </div>
    </div>
  );
}

function Preview({ label, title, done, children }: { label: string; title: string; done: boolean; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {label}
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              <Check className="size-3.5" aria-hidden /> Đã xong hôm nay
            </span>
          )}
        </p>
        <h2 className="mt-1 text-xl font-bold leading-snug">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const Actions = ({ children }: { children: ReactNode }) => <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">{children}</div>;

function ReadingPreview({ set, pick, onPick, done }: { set: P3Set | undefined; pick: Pick; onPick: (p: Pick) => void; done: boolean }) {
  const fin = set ? getProgress().done[set.id] : undefined;
  const sum = set ? setSummary(set) : null;
  return (
    <Preview label="Reading · Passage 3" title={set?.title ?? 'Chưa có đề Cambridge nào'} done={done}>
      <div className="inline-grid w-fit grid-cols-3 rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Dạng bài">
        {PICKS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={pick === o.id}
            onClick={() => onPick(o.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pick === o.id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {set ? (
        <>
          <div className="flex gap-4">
            <CoverArt id={set.id} art={set.art} className="h-24 w-32 shrink-0 rounded-lg" />
            <div className="min-w-0 text-sm text-muted-foreground">
              <p>{set.topic}</p>
              <p>
                {TYPE_INFO[set.type].label} · {set.items.length} câu · khoảng 10 phút
              </p>
              <p className="mt-1">{fin ? `Đã làm, được ${fin.score}/${fin.total} — ôn lại bài điểm thấp nhất` : sum?.checked ? `Đang làm ${sum.checked}/${set.items.length} câu` : 'Bài mới'}</p>
            </div>
          </div>
          <p className="line-clamp-3 font-serif text-[15px] leading-relaxed text-foreground/80" lang="en">
            {set.passage}
          </p>
          <Actions>
            <Button asChild data-start>
              <Link to={`/ielts/passage3/${set.id}`}>{sum && sum.checked > 0 && !fin ? 'Làm tiếp' : 'Bắt đầu'}</Link>
            </Button>
            <Button asChild variant="ghost" className="ml-auto">
              <Link to="/ielts/passage3">Chọn bài khác</Link>
            </Button>
          </Actions>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Mở sách Cambridge, dán Passage 3 và 4–5 câu hỏi là luyện được ngay.</p>
          <Actions>
            <Button asChild variant="outline">
              <Link to="/ielts/passage3?tab=cambridge">Chọn đề Cambridge</Link>
            </Button>
          </Actions>
        </>
      )}
    </Preview>
  );
}
