import { PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { youtubeThumbnail } from '@/lib/youtube';
import { cn } from '@/lib/utils';
import type { VideoSummary } from './api';

/** YouTube thumbnail with a neutral fallback when the image can't load (offline, removed video). */
export function VideoThumbnail({ video, className }: { video: Pick<VideoSummary, 'youtube_id' | 'thumbnail_url' | 'title' | 'language'>; className?: string }) {
  const src = video.thumbnail_url ?? (video.youtube_id ? youtubeThumbnail(video.youtube_id) : null);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn('relative aspect-video overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900', className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-white/80">
          <PlayCircle className="size-8" aria-hidden />
          <span className="line-clamp-2 text-xs" lang={video.language === 'zh' ? 'zh' : undefined}>
            {video.title}
          </span>
        </div>
      )}
    </div>
  );
}
