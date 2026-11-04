import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Toggle chip used for multi/single choice in the learning-profile wizard. */
export function Chip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary bg-accent font-medium text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {selected && <Check className="size-3.5" />}
      {children}
    </button>
  );
}
