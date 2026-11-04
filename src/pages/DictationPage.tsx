import { ArrowLeft, BookX } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinishedSentences } from '@/features/dictation/api';
import { DictationRoom } from '@/features/dictation/DictationRoom';
import { useLesson, useLessonSentences } from '@/features/library/api';

export default function DictationPage() {
  const { lessonId } = useParams();
  const [params] = useSearchParams();
  const lesson = useLesson(lessonId);
  const sentences = useLessonSentences(lessonId, Boolean(lesson.data));
  const ids = sentences.data?.map((s) => s.id) ?? [];
  const finished = useFinishedSentences(lessonId ?? '', ids);

  const back = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
      <Link to={lessonId ? `/lessons/${lessonId}` : '/lessons'}>
        <ArrowLeft /> Back
      </Link>
    </Button>
  );

  const error = lesson.error ?? sentences.error ?? finished.error;
  if (error) return (<>{back}<ErrorState error={error} onRetry={() => { lesson.refetch(); sentences.refetch(); finished.refetch(); }} /></>);
  if (lesson.isSuccess && !lesson.data) return (<>{back}<EmptyState icon={BookX} title="Lesson not found" /></>);
  if (sentences.isSuccess && sentences.data.length === 0) return (<>{back}<EmptyState icon={BookX} title="This lesson has no sentences yet" /></>);
  if (!lesson.data || !sentences.data || !finished.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // ?s=<position> opens a specific sentence; otherwise resume at the first unfinished one.
  const requested = Number(params.get('s'));
  const byPosition = sentences.data.findIndex((s) => s.position === requested);
  const firstOpen = sentences.data.findIndex((s) => !finished.data.has(s.id));
  const start = byPosition >= 0 ? byPosition : Math.max(firstOpen, 0);

  return <DictationRoom key={lesson.data.id} lesson={lesson.data} sentences={sentences.data} startIndex={start} previouslyFinished={finished.data} />;
}
