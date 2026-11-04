import { cn } from '@/lib/utils';

export function Kbd({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <kbd className={cn('rounded border px-1.5 py-0.5 font-mono text-[11px]', dark ? 'border-white/20 bg-white/10 text-white' : 'bg-muted text-muted-foreground')}>
      {children}
    </kbd>
  );
}
