import { ArrowLeft, BookX, Clock, FileText, Gauge, Headphones, ListOrdered } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavoriteIds, useLesson, useLessonSentences, useProgressMap } from '@/features/library/api';
import { DIFFICULTY_LABELS, estimateMinutes } from '@/features/library/constants';
import { FavoriteButton } from '@/features/library/FavoriteButton';
import { LessonBadges } from '@/features/library/LessonBadges';
import { SentenceList } from '@/features/library/SentenceList';

export default function LessonDetailPage() {
  const { lessonId } = useParams();
  const lesson = useLesson(lessonId);
  const sentences = useLessonSentences(lessonId, Boolean(lesson.data));
  const favorites = useFavoriteIds();
  const progressMap = useProgressMap();

  const back = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
      <Link to="/lessons">
        <ArrowLeft /> All lessons
      </Link>
    </Button>
  );

  if (lesson.isPending) {
    return (
      <>
        {back}
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }
  if (lesson.isError) return (<>{back}<ErrorState error={lesson.error} onRetry={() => lesson.refetch()} title="Could not load this lesson" /></>);
  if (!lesson.data) return (<>{back}<EmptyState icon={BookX} title="Lesson not found" description="It may have been removed or is not published yet." /></>);

  const l = lesson.data;
  const isZh = l.language === 'zh';
  const [main, subtitle] = (l.title ?? '').split(' · ');
  const total = l.sentence_count ?? 0;
  const done = progressMap.data?.get(l.id!)?.finished_sentences ?? 0;

  return (
    <>
      {back}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <div>
            <LessonBadges lesson={l} />
            <h1 className="mt-3 text-2xl font-semibold tracking-tight" lang={isZh ? 'zh' : undefined}>
              {main}
            </h1>
            {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
            {l.description && <p className="mt-3 max-w-prose text-sm leading-relaxed">{l.description}</p>}
          </div>
          {sentences.isError ? (
            <ErrorState error={sentences.error} onRetry={() => sentences.refetch()} />
          ) : sentences.isPending ? (
            <Skeleton className="h-80" />
          ) : sentences.data.length === 0 ? (
            <EmptyState icon={FileText} title="No sentences yet" description="This lesson has no sentences to practise." />
          ) : (
            <SentenceList sentences={sentences.data} language={l.language!} />
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Lesson</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat icon={ListOrdered} label="Sentences" value={total} />
              <Stat icon={FileText} label={isZh ? 'Characters' : 'Words'} value={l.word_count ?? 0} />
              <Stat icon={Gauge} label="Difficulty" value={DIFFICULTY_LABELS[l.difficulty ?? 3] ?? '—'} />
              <Stat icon={Clock} label="Time" value={`~${estimateMinutes(total)} min`} />
            </dl>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {done} / {total}
                </span>
              </div>
              <Progress value={total ? (done / total) * 100 : 0} label="Lesson progress" />
            </div>
            <div className="space-y-2">
              <Button className="w-full" asChild>
                <Link to={`/lessons/${l.id}/practice`}>
                  <Headphones /> {done === 0 ? 'Start dictation' : done >= total ? 'Practise again' : 'Continue dictation'}
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">Listen to each sentence, type it, and check your answer.</p>
            </div>
            <FavoriteButton lessonId={l.id!} isFavorite={favorites.data?.has(l.id!) ?? false} withLabel className="w-full justify-center rounded-md" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof ListOrdered; label: string; value: string | number }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
