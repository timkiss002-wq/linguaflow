import { cn } from '@/lib/utils';

/** Typing mastery 0–4 as dots (4 = ready for spaced review). */
export function TypingDots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Typing level ${level} of 4`} title={`Typing level ${level}/4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={cn('size-1.5 rounded-full', i <= level ? 'bg-primary' : 'bg-muted-foreground/25')} />
      ))}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    new: 'bg-secondary text-secondary-foreground',
    learning: 'bg-warning/15 text-warning',
    reviewing: 'bg-accent text-accent-foreground',
    mastered: 'bg-success/15 text-success',
  };
  return <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium capitalize', cls[status])}>{status}</span>;
}
