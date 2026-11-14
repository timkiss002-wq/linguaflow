import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { DayTasks } from '@/features/roadmap/DayTasks';
import { useRoadmapContext } from '@/features/roadmap/useRoadmap';
import { DAYS, addDays, dayByDate, phaseOf, todayKey, toDate, weekByNumber } from '@/lib/roadmap/plan';
import { dayStatus } from '@/lib/roadmap/progress';

/** /lo-trinh/:date — the tasks of one day, with the words to learn and links to each exercise. */
export default function RoadmapDayPage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const ctx = useRoadmapContext();
  if (!day)
    return (
      <EmptyState
        icon={CalendarDays}
        title="Ngày này không nằm trong lộ trình"
        description="Lộ trình chạy từ 14/11/2026 đến 15/04/2027."
        action={
          <Button asChild variant="outline">
            <Link to="/lo-trinh">Xem lộ trình</Link>
          </Button>
        }
      />
    );
  const week = weekByNumber(day.week)!;
  const phase = phaseOf(day.phase);
  const s = dayStatus(day, ctx);
  const today = todayKey();
  const prev = dayByDate(addDays(date, -1));
  const next = dayByDate(addDays(date, 1));
  const minutes = day.tasks.reduce((m, t) => m + t.minutes, 0);
  const label = toDate(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const index = DAYS.indexOf(day) + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <Link to="/lo-trinh" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> Lộ trình
        </Link>
        <div className="flex gap-1">
          {prev && (
            <Button asChild size="sm" variant="ghost">
              <Link to={`/lo-trinh/${prev.date}`}>
                <ArrowLeft /> Hôm trước
              </Link>
            </Button>
          )}
          {next && (
            <Button asChild size="sm" variant="ghost">
              <Link to={`/lo-trinh/${next.date}`}>
                Hôm sau <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          {phase.name} · Tuần {week.n}: {week.title} · ngày {index}/{DAYS.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight first-letter:uppercase">{label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {s.total ? `${s.done}/${s.total} việc xong` : 'Ngày nghỉ'} · khoảng {minutes} phút{day.note ? ` · ${day.note}` : ''}
          {date > today && ' · chưa tới ngày, đang xem trước'}
        </p>
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">{week.focus}</p>
      </header>
      <DayTasks day={day} ctx={ctx} />
    </div>
  );
}
