import { Badge } from '@/components/ui/badge';
import { levelLabel, type CefrLevel } from './constants';
import type { VideoSummary } from './api';

export function VideoBadges({ video }: { video: Pick<VideoSummary, 'language' | 'level' | 'hsk_level' | 'is_sample'> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{video.language === 'zh' ? '中文' : 'EN'}</Badge>
      {video.hsk_level ? <Badge variant="accent">HSK {video.hsk_level}</Badge> : null}
      {video.level && <Badge variant="outline">{levelLabel(video.level as CefrLevel)}</Badge>}
      {video.is_sample && <Badge variant="warning">Demo</Badge>}
    </div>
  );
}
