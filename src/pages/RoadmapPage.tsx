import { CalendarDays, Flag, Languages, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRoadmapContext } from '@/features/roadmap/useRoadmap';
import { topicById } from '@/lib/grammar/drills';
import { DAYS, PHASES, TARGET, TARGET_BAND, WEEKS, WEEKDAY_VI, daysBetween, daysOfWeek, formatDay, toDate, todayKey, NEW_WORDS, ALL_WORDS, type Week } from '@/lib/roadmap/plan';
import { currentTopic, dayStatus, type Context, type DayStatus } from '@/lib/roadmap/progress';
import { cn } from '@/lib/utils';

/** /lo-trinh — the whole path at a glance: phases, the grammar topic now open, and every week with its seven days. */
export default function RoadmapPage() {
  const ctx = useRoadmapContext();
  const today = todayKey();
  const left = Math.max(0, daysBetween(today, TARGET));
  const past = DAYS.filter((d) => d.date <= today);
  const statuses = past.map((d) => dayStatus(d, ctx));
  const tasksDone = statuses.reduce((s, x) => s + x.done, 0);
  const tasksDue = statuses.reduce((s, x) => s + x.total, 0);
  const allTasks = DAYS.reduce((s, d) => s + d.tasks.filter((t) => t.kind !== 'rest').length, 0);
  const topic = currentTopic();
  const t = topic ? topicById(topic) : undefined;
  const nowWeek = [...WEEKS].reverse().find((w) => w.start <= today) ?? WEEKS[0]!;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Lộ trình cá nhân · từ band 5.0 (14/11/2026)</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">IELTS {TARGET_BAND} trước ngày 15/04/2027</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Đi theo đúng thứ tự: nền ngữ pháp và từ vựng → bài tập nhỏ theo dạng câu → thi thử đề đầy đủ. Ngày chưa tới chỉ xem trước; việc còn nợ của ngày trước hiện đầu tiên ở trang Hôm nay.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-3 text-center">
          <Stat label="ngày còn lại" value={left} />
          <Stat label="việc đã xong" value={`${tasksDone}/${tasksDue}`} hint={`trên tổng ${allTasks}`} />
          <Stat label="từ cần học" value={NEW_WORDS.length} hint={`${ALL_WORDS.length - NEW_WORDS.length} từ đã thuộc`} />
        </div>
      </header>

      <ol className="grid gap-3 md:grid-cols-4" aria-label="Các giai đoạn">
        {PHASES.map((p) => {
          const on = p.from <= today && today <= p.to;
          return (
            <li key={p.id} className={cn('rounded-xl border p-4', on ? 'border-primary bg-primary/5' : 'bg-card')}>
              <p className="text-xs font-medium text-muted-foreground">
                {formatDay(p.from)} → {formatDay(p.to)}
                {on && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">đang ở đây</span>}
              </p>
              <p className="mt-1 font-semibold">{p.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.goal}</p>
            </li>
          );
        })}
      </ol>

      {t && (
        <section className="flex flex-col gap-3 rounded-xl border border-teal-300 bg-teal-50 p-4 sm:flex-row sm:items-center dark:border-teal-500/30 dark:bg-teal-500/10">
          <Languages className="size-6 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Chủ điểm ngữ pháp đang mở: {t.title_vi}</p>
            <p className="text-muted-foreground">Chủ điểm sau chỉ mở khi chủ điểm này đạt ≥ 80% ở cả phần nhận diện và phần dịch câu.</p>
          </div>
          <Button asChild size="sm">
            <Link to={`/grammar/${t.id}`}>Học chủ điểm này</Link>
          </Button>
        </section>
      )}

      {PHASES.map((p) => (
        <section key={p.id} aria-labelledby={`phase-${p.id}`}>
          <h2 id={`phase-${p.id}`} className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Flag className="size-4 text-muted-foreground" aria-hidden /> {p.name}
          </h2>
          <div className="divide-y rounded-xl border bg-card">
            {WEEKS.filter((w) => w.phase === p.id).map((w) => (
              <WeekRow key={w.n} week={w} ctx={ctx} today={today} current={w.n === nowWeek.n} />
            ))}
          </div>
        </section>
      ))}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" aria-hidden /> Tiến độ lưu trong trình duyệt này (cùng chỗ với điểm ngữ pháp và Passage 3). Từ vựng được đọc từ Sổ từ.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const CHIP: Record<DayStatus['state'], string> = {
  done: 'bg-success text-success-foreground border-success',
  partial: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40',
  missed: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/40',
  today: 'bg-primary text-primary-foreground border-primary',
  future: 'bg-card text-muted-foreground border-border',
  empty: 'bg-muted text-muted-foreground border-transparent',
};
const STATE_LABEL: Record<DayStatus['state'], string> = { done: 'xong', partial: 'làm dở', missed: 'chưa làm', today: 'hôm nay', future: 'chưa tới', empty: 'nghỉ' };

function WeekRow({ week, ctx, today, current }: { week: Week; ctx: Context; today: string; current: boolean }) {
  const days = daysOfWeek(week.n);
  const end = days[days.length - 1]!.date;
  const grammar = week.grammar?.map((g) => topicById(g)?.title_vi).join(' · ');
  return (
    <div className={cn('grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center', current && 'bg-primary/5')} data-week={week.n}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">
          {week.n === 0 ? 'Tuần 0' : `Tuần ${week.n}`} · {formatDay(week.start)} – {formatDay(end)}
        </p>
        <p className="font-semibold">{week.title}</p>
        <p className="text-sm text-muted-foreground">{week.focus}</p>
        {(grammar || week.skill || week.frames) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {grammar && <>Ngữ pháp: {grammar}</>}
            {week.skill && <>Reading: {week.skill.name}</>}
            {week.frames && <> · Writing: {week.frames.join(', ')}</>}
          </p>
        )}
      </div>
      <ol className="flex gap-1.5" aria-label={`Các ngày tuần ${week.n}`}>
        {days.map((d) => {
          const s = dayStatus(d, ctx, today);
          const date = toDate(d.date);
          return (
            <li key={d.date}>
              <Link
                to={`/lo-trinh/${d.date}`}
                title={`${formatDay(d.date)} · ${STATE_LABEL[s.state]}${s.total ? ` · ${s.done}/${s.total} việc` : ''}${d.note ? ` · ${d.note}` : ''}`}
                className={cn('flex h-12 w-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', CHIP[s.state], d.light && s.state === 'future' && 'border-dashed')}
              >
                <span className="text-[10px] font-medium opacity-80">{WEEKDAY_VI[d.weekday]}</span>
                {s.state === 'future' && d.date > today ? (
                  <span className="flex items-center gap-0.5">
                    {date.getDate()}
                    <Lock className="size-2.5 opacity-60" aria-hidden />
                  </span>
                ) : (
                  <span>{date.getDate()}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
