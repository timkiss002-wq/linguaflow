import { Skeleton } from '@/components/ui/skeleton';
import type { VideoProgress, VideoSummary } from './api';
import { VideoCard } from './VideoCard';

export function VideoGrid({ videos, favorites, progress }: { videos: VideoSummary[]; favorites?: Set<string>; progress?: Map<string, VideoProgress> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} isFavorite={favorites?.has(v.id!) ?? false} progress={progress?.get(v.id!)} />
      ))}
    </div>
  );
}

export function VideoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading videos">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-video rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
