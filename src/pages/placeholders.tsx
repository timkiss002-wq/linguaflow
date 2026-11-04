import { BarChart3, Layers } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';

export function ReviewPage() {
  return (
    <ComingSoon
      title="Review"
      icon={Layers}
      description="Flashcard review with spaced repetition (SM-2)."
      bullets={['Due today and upcoming reviews', 'Again / Hard / Good / Easy ratings', 'Pronunciation audio for English and Chinese']}
    />
  );
}

export function StatisticsPage() {
  return (
    <ComingSoon
      title="Statistics"
      icon={BarChart3}
      description="Detailed learning statistics are planned for Phase 2."
      bullets={['Study time per day and week', 'Listening accuracy over time', 'Most common mistakes']}
    />
  );
}
