import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LessonBadges } from '@/features/library/LessonBadges';
import type { LessonSummary } from '@/features/library/api';
import type { Recommendation } from '@/lib/personal/goals';

export function RecommendedList({ items }: { items: Recommendation<LessonSummary>[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No new lessons at your level right now — you've done them all.</p>;
  return (
    <ul className="space-y-2" data-testid="recommended">
      {items.map(({ lesson, reasons }) => (
        <li key={lesson.id}>
          <Link to={`/lessons/${lesson.id}`} className="block rounded-md border bg-card p-3 transition-colors hover:bg-muted">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium" lang={lesson.language === 'zh' ? 'zh' : undefined}>
                {lesson.title?.split(' · ')[0]}
              </span>
              <LessonBadges lesson={lesson} />
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> {reasons.join(' · ')}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
