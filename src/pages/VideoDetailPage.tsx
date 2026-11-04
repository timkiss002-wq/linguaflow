import { ArrowLeft, ExternalLink, FileText, Gauge, Headphones, Info, ListOrdered, VideoOff } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavoriteIds, useProgressMap, useVideo, useVideoSegments } from '@/features/library/api';
import { DIFFICULTY_LABELS } from '@/features/library/constants';
import { FavoriteButton } from '@/features/library/FavoriteButton';
import { SegmentList } from '@/features/library/SegmentList';
import { VideoBadges } from '@/features/library/VideoBadges';
import { VideoThumbnail } from '@/features/library/VideoThumbnail';
import { formatDuration } from '@/lib/format';
import { youtubeWatchUrl } from '@/lib/youtube';

export default function VideoDetailPage() {
  const { videoId } = useParams();
  const video = useVideo(videoId);
  const segments = useVideoSegments(videoId, Boolean(video.data));
  const favorites = useFavoriteIds();
  const progressMap = useProgressMap();

  const back = (
    <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
      <Link to="/library">
        <ArrowLeft /> Back to library
      </Link>
    </Button>
  );

  if (video.isPending) {
    return (
      <>
        {back}
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="aspect-video lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }
  if (video.isError) return (<>{back}<ErrorState error={video.error} onRetry={() => video.refetch()} title="Could not load this video" /></>);
  if (!video.data) {
    return (
      <>
        {back}
        <EmptyState icon={VideoOff} title="Video not found" description="It may have been removed or is not published yet." />
      </>
    );
  }

  const v = video.data;
  const progress = progressMap.data?.get(v.id!);
  const total = v.segment_count ?? 0;
  const done = progress?.finished_segments ?? 0;
  const hasLesson = total > 0;
  const isZh = v.language === 'zh';

  return (
    <>
      {back}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="relative overflow-hidden rounded-lg border">
            <VideoThumbnail video={v} />
            {v.youtube_id && (
              <a
                href={youtubeWatchUrl(v.youtube_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
              >
                Watch on YouTube <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          <div>
            <VideoBadges video={v} />
            <h1 className="mt-3 text-2xl font-semibold tracking-tight" lang={isZh ? 'zh' : undefined}>
              {v.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {v.source_name}
              {v.topic_name ? ` · ${v.topic_name}` : ''}
              {v.duration_seconds ? ` · ${formatDuration(v.duration_seconds)}` : ''}
            </p>
            {v.description && <p className="mt-4 max-w-prose text-sm leading-relaxed">{v.description}</p>}
            {v.license_note && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {v.license_note}
              </p>
            )}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Lesson</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><ListOrdered className="size-3.5" /> Sentences</dt>
                <dd className="mt-0.5 font-medium">{hasLesson ? total : '—'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><FileText className="size-3.5" /> {isZh ? 'Characters' : 'Words'}</dt>
                <dd className="mt-0.5 font-medium">{hasLesson ? v.word_count : '—'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Gauge className="size-3.5" /> Difficulty</dt>
                <dd className="mt-0.5 font-medium">{DIFFICULTY_LABELS[v.difficulty ?? 3]}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Headphones className="size-3.5" /> Progress</dt>
                <dd className="mt-0.5 font-medium">{hasLesson ? `${done} / ${total}` : '—'}</dd>
              </div>
            </dl>
            {hasLesson && <Progress value={(done / total) * 100} label="Lesson progress" />}

            <div className="space-y-2">
              <Button className="w-full" disabled>
                <Headphones /> Start dictation
              </Button>
              <p className="text-xs text-muted-foreground">
                {hasLesson ? 'The Dictation Room opens in the next update.' : 'Available once lesson sentences are added to this video.'}
              </p>
            </div>
            <FavoriteButton videoId={v.id!} isFavorite={favorites.data?.has(v.id!) ?? false} withLabel className="w-full justify-center rounded-md" />
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Sentences</h2>
        {segments.isError ? (
          <ErrorState error={segments.error} onRetry={() => segments.refetch()} />
        ) : segments.isPending ? (
          <Skeleton className="h-40" />
        ) : segments.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No lesson sentences yet"
            description="Each sentence needs exact start/end times that match the audio. An admin adds them with the segment editor or by importing an SRT/VTT file."
          />
        ) : (
          <SegmentList segments={segments.data} language={v.language!} />
        )}
      </section>
    </>
  );
}
