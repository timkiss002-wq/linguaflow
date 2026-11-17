import { ArrowLeft, Circle, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useRoadmapContext } from '@/features/roadmap/useRoadmap';
import { PRACTICE_PASS, practiceOf, savePractice } from '@/lib/practice/results';
import { dayByDate, formatDay, type Day, type Task, type TaskKind } from '@/lib/roadmap/plan';
import { lockReason, refreshRoadmap } from '@/lib/roadmap/progress';

/** Finds the day's task of a practice kind; renders the frame (back link, title, lock, best score) around the exercise. */
export function PracticeShell({
  date,
  kind,
  title,
  intro,
  empty,
  children,
}: {
  date: string;
  kind: TaskKind;
  title: string;
  intro: ReactNode;
  empty: string;
  children: (args: { day: Day; task: Task; save: (score: number, total: number) => void }) => ReactNode;
}) {
  const ctx = useRoadmapContext();
  const day = dayByDate(date);
  const task = day?.tasks.find((t) => t.kind === kind);
  if (!day || !task)
    return (
      <EmptyState
        icon={Circle}
        title="Ngày này không có bài này"
        description={empty}
        action={
          <Button asChild variant="outline">
            <Link to="/lo-trinh">Xem lộ trình</Link>
          </Button>
        }
      />
    );
  const lock = lockReason(task, day, ctx);
  const best = practiceOf(task.id);
  const save = (score: number, total: number) => {
    savePractice(task.id, score, total);
    refreshRoadmap();
    if (total && score / total >= PRACTICE_PASS) toast.success(`Đạt ${score}/${total} — đã xong việc này.`);
    else toast(`${score}/${total} câu đúng ngay lần đầu. Cần ${Math.ceil(total * PRACTICE_PASS)} để hoàn thành.`);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={`/lo-trinh/${date}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden /> {formatDay(date)}
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-1 text-sm text-muted-foreground">{intro}</div>
        {best && (
          <p className="mt-1 text-sm text-muted-foreground">
            Điểm cao nhất: {best.best}/{best.total}
          </p>
        )}
      </header>
      {lock ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="size-4" aria-hidden /> {lock}
        </p>
      ) : (
        children({ day, task, save })
      )}
    </div>
  );
}
