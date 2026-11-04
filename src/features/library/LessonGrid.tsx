import { Skeleton } from '@/components/ui/skeleton';
import type { LessonProgress, LessonSummary } from './api';
import { LessonCard } from './LessonCard';

export function LessonGrid({ lessons, favorites, progress }: { lessons: LessonSummary[]; favorites?: Set<string>; progress?: Map<string, LessonProgress> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lessons.map((l) => (
        <LessonCard key={l.id} lesson={l} isFavorite={favorites?.has(l.id!) ?? false} progress={progress?.get(l.id!)} />
      ))}
    </div>
  );
}

export function LessonGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading lessons">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-card p-5">
          <Skeleton className="size-11" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
