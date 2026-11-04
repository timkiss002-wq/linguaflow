import { POS_CLASS, POS_LABEL, type Pos } from '@/lib/vocab/pos';
import { cn } from '@/lib/utils';

export function PosBadge({ pos, className }: { pos: string | null | undefined; className?: string }) {
  if (!pos) return null;
  const p = pos as Pos;
  return <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold', POS_CLASS[p] ?? POS_CLASS.other, className)}>{POS_LABEL[p] ?? pos}</span>;
}
