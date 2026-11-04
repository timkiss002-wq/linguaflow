import { BarChart3 } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';

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
