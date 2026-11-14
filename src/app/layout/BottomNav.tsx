import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { sectionFor, SECTIONS } from './nav';

/** Phone navigation: the four areas as a tab bar at the bottom, within thumb reach. */
export function BottomNav() {
  const { pathname } = useLocation();
  const active = sectionFor(pathname)?.id;
  const sections = SECTIONS;
  return (
    <nav aria-label="Menu chính" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-4">
        {sections.map((s) => {
          const on = active === s.id;
          return (
            <li key={s.id}>
              <NavLink to={s.to} aria-current={on ? 'page' : undefined} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium">
                <span className={cn('flex h-7 w-10 items-center justify-center rounded-full transition-colors', on ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className={on ? 'text-primary' : 'text-muted-foreground'}>{s.short ?? s.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
