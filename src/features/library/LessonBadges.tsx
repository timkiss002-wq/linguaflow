import { Badge } from '@/components/ui/badge';
import { levelLabel, type CefrLevel } from './constants';
import type { LessonSummary } from './api';

export function LessonBadges({ lesson }: { lesson: Pick<LessonSummary, 'language' | 'level' | 'hsk_level' | 'is_sample'> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{lesson.language === 'zh' ? '中文' : 'English'}</Badge>
      {lesson.hsk_level ? <Badge variant="accent">HSK {lesson.hsk_level}</Badge> : null}
      {lesson.level && <Badge variant="outline">{levelLabel(lesson.level as CefrLevel)}</Badge>}
      {lesson.is_sample && <Badge variant="warning">Demo</Badge>}
    </div>
  );
}
