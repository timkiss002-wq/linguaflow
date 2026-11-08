import { NavLink, useLocation } from 'react-router-dom';
import { LogoMark } from '@/components/Logo';
import { useDueToday } from '@/features/dashboard/api';
import { useStudyLanguage } from '@/features/study/context';
import { cn } from '@/lib/utils';
import { sectionFor, sectionsFor } from './nav';
import { UserMenu } from './UserMenu';

/**
 * Desktop main menu: a rail of the four areas down the left edge, icon above a short label, so the content gets the
 * width. The pages of an area are tabs at the top of the content (TopBar). One accent: the active area.
 */
export function Rail() {
  const { pathname } = useLocation();
  const active = sectionFor(pathname)?.id;
  const { lang } = useStudyLanguage();
  const due = useDueToday();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r bg-card py-3 lg:flex" data-testid="rail">
      <NavLink to="/dashboard" aria-label="LinguaFlow — Hôm nay" className="mb-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <LogoMark className="size-9" />
      </NavLink>
      <nav aria-label="Menu chính" className="flex flex-1 flex-col items-center gap-1.5">
        {sectionsFor(lang).map((s) => {
          const on = active === s.id;
          return (
            <NavLink
              key={s.id}
              to={s.to}
              title={s.hint}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'relative flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <s.icon className="size-5" aria-hidden />
              <span className="leading-tight">{s.label}</span>
              {s.id === 'words' && !!due && (
                <span className="absolute right-1.5 top-1 min-w-[18px] rounded-full bg-primary px-1 text-center text-[11px] font-semibold leading-[18px] text-primary-foreground tabular-nums" title={`${due} thẻ cần ôn hôm nay`}>
                  {due}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="w-14">
        <UserMenu compact />
      </div>
    </aside>
  );
}
