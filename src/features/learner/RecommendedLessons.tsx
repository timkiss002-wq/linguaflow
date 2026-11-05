import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coverFor } from '@/features/library/cover';
import { LessonBadges } from '@/features/library/LessonBadges';
import type { LessonSummary } from '@/features/library/api';
import type { Recommendation } from '@/lib/personal/goals';
import { cn } from '@/lib/utils';

export function RecommendedList({ items, columns = 1 }: { items: Recommendation<LessonSummary>[]; columns?: 1 | 2 }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No new lessons at your level right now — you've done them all.</p>;
  return (
    <ul className={cn('grid gap-2.5', columns === 2 && 'sm:grid-cols-2')} data-testid="recommended">
      {items.map(({ lesson, reasons }) => {
        const cover = coverFor(lesson.topic_slug);
        return (
          <li key={lesson.id}>
            <Link to={`/lessons/${lesson.id}`} className="flex h-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-soft">
              <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', cover.gradient)} aria-hidden>
                <cover.icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold" lang={lesson.language === 'zh' ? 'zh' : undefined}>
                    {lesson.title?.split(' · ')[0]}
                  </span>
                  <LessonBadges lesson={lesson} />
                </span>
                <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="size-3 text-primary" aria-hidden /> {reasons.join(' · ')}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
