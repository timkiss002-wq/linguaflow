import { CheckCircle2, Clock, ListOrdered } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { formatDuration } from '@/lib/format';
import type { VideoProgress, VideoSummary } from './api';
import { FavoriteButton } from './FavoriteButton';
import { VideoBadges } from './VideoBadges';
import { VideoThumbnail } from './VideoThumbnail';

export function VideoCard({ video, isFavorite, progress }: { video: VideoSummary; isFavorite: boolean; progress?: VideoProgress }) {
  const total = video.segment_count ?? 0;
  const done = progress?.finished_segments ?? 0;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const completed = progress?.status === 'completed';

  return (
    <Link
      to={`/videos/${video.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <VideoThumbnail video={video} />
        <FavoriteButton videoId={video.id!} isFavorite={isFavorite} className="absolute right-2 top-2" />
        {video.duration_seconds ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">{formatDuration(video.duration_seconds)}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <VideoBadges video={video} />
        <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-primary">{video.title}</h3>
        <p className="text-xs text-muted-foreground">
          {video.source_name}
          {video.topic_name ? ` · ${video.topic_name}` : ''}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          {total > 0 ? (
            <span className="inline-flex items-center gap-1">
              <ListOrdered className="size-3.5" aria-hidden /> {total} sentences
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden /> Transcript pending
            </span>
          )}
          {completed && (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="size-3.5" aria-hidden /> Completed
            </span>
          )}
        </div>
        {total > 0 && done > 0 && <Progress value={pct} label={`${done} of ${total} sentences done`} />}
      </div>
    </Link>
  );
}
