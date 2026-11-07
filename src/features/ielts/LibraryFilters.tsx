import { Filter } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

/** Filters of a practice library: a sticky column on desktop, a folded panel on phones so the cards come first. */
export function FilterPanel({ active, children }: { active: number; children: ReactNode }) {
  const wide = useMediaQuery('(min-width: 1024px)');
  return wide ? (
    <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start" aria-label="Bộ lọc">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Filter className="size-4" aria-hidden /> Bộ lọc
      </p>
      {children}
    </aside>
  ) : (
    <details className="rounded-xl border bg-card p-3 [&_fieldset]:border-0 [&_fieldset]:p-0 [&_fieldset]:ring-0">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Filter className="size-4" aria-hidden /> Bộ lọc{active > 0 && <Badge variant="secondary">{active}</Badge>}
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}

export function FilterBox({ title, icon, highlight, children }: { title: string; icon?: ReactNode; highlight?: boolean; children: ReactNode }) {
  return (
    <fieldset className={cn('rounded-xl border bg-card p-3', highlight && 'border-amber-300 ring-1 ring-amber-200 dark:border-amber-500/40 dark:ring-amber-500/20')}>
      <legend className="sr-only">{title}</legend>
      <p className={cn('mb-2 flex items-center gap-2 text-sm font-semibold', highlight && 'text-amber-800 dark:text-amber-300')} aria-hidden>
        {icon}
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

export function Radio({ name, checked, onChange, label, hint }: { name: string; checked: boolean; onChange: () => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="radio" name={name} className="size-4 accent-amber-600" checked={checked} onChange={onChange} />
      <span>
        {label}
        {hint && <span className="ml-1.5 text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}


export function Check({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-amber-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
