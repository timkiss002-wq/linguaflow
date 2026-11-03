import { Construction } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from './PageHeader';

/** Honest placeholder for sections that are scheduled but not built yet. */
export function ComingSoon({ title, description, icon: Icon = Construction, bullets }: {
  title: string;
  description: string;
  icon?: LucideIcon;
  bullets: string[];
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-lg border border-dashed bg-card p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-accent p-2.5 text-accent-foreground">
            <Icon className="size-5" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Not available yet</p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
