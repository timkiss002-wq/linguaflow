import { CheckCircle2, Clock, ListOrdered } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LessonProgress, LessonSummary } from './api';
import { estimateMinutes } from './constants';
import { FavoriteButton } from './FavoriteButton';
import { LessonBadges } from './LessonBadges';

export function LessonCard({ lesson, isFavorite, progress }: { lesson: LessonSummary; isFavorite: boolean; progress?: LessonProgress }) {
  const total = lesson.sentence_count ?? 0;
  const done = progress?.finished_sentences ?? 0;
  const completed = progress?.status === 'completed';
  const isZh = lesson.language === 'zh';
  // "周末的计划 · Weekend plans" → native title + English subtitle.
  const [main, subtitle] = (lesson.title ?? '').split(' · ');

  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className="group relative flex flex-col rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          aria-hidden
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold',
            isZh ? 'bg-accent font-han text-accent-foreground' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {isZh ? (lesson.hsk_level ? `${lesson.hsk_level}级` : '中') : 'En'}
        </div>
        <FavoriteButton lessonId={lesson.id!} isFavorite={isFavorite} className="size-8 border bg-card text-muted-foreground hover:bg-muted" />
      </div>
      <h3 className="mt-4 text-base font-semibold leading-snug group-hover:text-primary" lang={isZh ? 'zh' : undefined}>
        {main}
      </h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      {lesson.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lesson.description}</p>}
      <div className="mt-4">
        <LessonBadges lesson={lesson} />
      </div>
      <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ListOrdered className="size-3.5" aria-hidden /> {total} sentences
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> ~{estimateMinutes(total)} min
        </span>
        {completed && (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="size-3.5" aria-hidden /> Completed
          </span>
        )}
      </div>
      {total > 0 && done > 0 && <Progress className="mt-3" value={(done / total) * 100} label={`${done} of ${total} sentences done`} />}
    </Link>
  );
}
