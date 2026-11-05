import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TONE, type Tone } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, icon: Icon, hint, loading, tone = 'slate' }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <span className={cn('flex size-9 items-center justify-center rounded-lg', TONE[tone].tile)}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-1 h-8 w-16" /> : <p className="text-2xl font-bold tabular-nums sm:text-[28px]">{value}</p>}
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </Card>
  );
}
