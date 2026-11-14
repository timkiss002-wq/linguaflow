import { ArrowRight, CalendarClock, Layers, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDueToday } from '@/features/dashboard/api';
import { useProfile } from '@/features/profile/api';
import { DayTasks, TaskCard } from '@/features/roadmap/DayTasks';
import { useRoadmapContext } from '@/features/roadmap/useRoadmap';
import { DAYS, START, TARGET, daysBetween, dayByDate, formatDay, phaseOf, todayKey, weekByNumber } from '@/lib/roadmap/plan';
import { backlog, dayStatus } from '@/lib/roadmap/progress';

function greeting(hour: number) {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/**
 * /dashboard — "Hôm nay": the day of the learning path. Unfinished work from earlier days comes first (the path is
 * linear), then today's tasks; on the right the week's focus, cards due and the countdown.
 */
export default function TodayPage() {
  const ctx = useRoadmapContext();
  const profile = useProfile();
  const due = useDueToday();
  const today = todayKey();
  const day = dayByDate(today) ?? (today < START ? DAYS[0]! : DAYS[DAYS.length - 1]!);
  const week = weekByNumber(day.week)!;
  const s = dayStatus(day, ctx);
  const owed = backlog(ctx).slice(0, 6);
  const owedTotal = backlog(ctx).length;
  const left = Math.max(0, daysBetween(today, TARGET));
  const date = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  const name = profile.data?.display_name;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{date}</p>
          <h1 className="text-2xl font-bold tracking-tight">{name ? `${greeting(new Date().getHours())}, ${name}` : 'Hôm nay'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {phaseOf(day.phase).name} · Tuần {week.n}: {week.title} · {s.total ? `${s.done}/${s.total} việc hôm nay` : 'hôm nay nghỉ'}
          </p>
        </div>
        <Link to="/lo-trinh" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Map className="size-4" aria-hidden /> Xem cả lộ trình
        </Link>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          {owedTotal > 0 && (
            <section aria-labelledby="owed" className="space-y-2.5">
              <h2 id="owed" className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <CalendarClock className="size-4" aria-hidden /> Làm bù trước · còn {owedTotal} việc của những ngày trước
              </h2>
              <ul className="space-y-2.5">
                {owed.map(({ day: d, task }) => (
                  <li key={task.id}>
                    <TaskCard task={task} day={d} ctx={ctx} compact showDate={formatDay(d.date)} />
                  </li>
                ))}
              </ul>
              {owedTotal > owed.length && <p className="text-xs text-muted-foreground">và {owedTotal - owed.length} việc khác — xem trong Lộ trình.</p>}
            </section>
          )}
          <section aria-labelledby="today-tasks" className="space-y-2.5">
            <h2 id="today-tasks" className="text-sm font-semibold">
              Việc hôm nay {day.date !== today && `(${formatDay(day.date)})`}
            </h2>
            <DayTasks day={day} ctx={ctx} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Trọng tâm tuần {week.n}</p>
            <p className="mt-1 text-sm">{week.focus}</p>
          </section>
          <section className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="size-3.5" aria-hidden /> Thẻ từ cần ôn hôm nay
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{due ?? '—'}</p>
            <Link to="/review" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {due ? 'Ôn ngay' : 'Mở sổ từ'} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </section>
          <section className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Đến ngày 15/04/2027</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{left} ngày</p>
            <p className="text-xs text-muted-foreground">Mục tiêu IELTS 6.5 · Reading và Writing</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
