import { CheckCircle2, Clock, ListOrdered } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LessonProgress, LessonSummary } from './api';
import { estimateMinutes } from './constants';
import { coverFor } from './cover';
import { FavoriteButton } from './FavoriteButton';
import { LessonBadges } from './LessonBadges';

export function LessonCard({ lesson, isFavorite, progress }: { lesson: LessonSummary; isFavorite: boolean; progress?: LessonProgress }) {
  const total = lesson.sentence_count ?? 0;
  const done = progress?.finished_sentences ?? 0;
  const completed = progress?.status === 'completed';
  const isZh = lesson.language === 'zh';
  // "周末的计划 · Weekend plans" → native title + English subtitle.
  const [main, subtitle] = (lesson.title ?? '').split(' · ');
  const cover = coverFor(lesson.topic_slug);

  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn('relative flex h-24 items-end justify-between bg-gradient-to-br p-4 text-white', cover.gradient)}>
        <cover.icon className="absolute -right-2 -top-3 size-24 opacity-20" aria-hidden />
        <span aria-hidden className={cn('rounded-lg bg-white/20 px-2.5 py-1 text-sm font-bold backdrop-blur', isZh && 'font-han')}>
          {isZh ? (lesson.hsk_level ? `HSK ${lesson.hsk_level}` : '中文') : 'EN'}
        </span>
        <FavoriteButton lessonId={lesson.id!} isFavorite={isFavorite} className="relative size-8 bg-white/90 text-rose-600 hover:bg-white" />
      </div>
      <div className="flex flex-1 flex-col p-5 pt-4">
      <h3 className="text-base font-semibold leading-snug group-hover:text-primary" lang={isZh ? 'zh' : undefined}>
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
      </div>
    </Link>
  );
}
