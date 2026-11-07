import { NavLink, useLocation } from 'react-router-dom';
import { useDueToday } from '@/features/dashboard/api';
import { TONE } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';
import { useStudyLanguage } from '@/features/study/context';
import { sectionFor, sectionsFor } from './nav';

/** Desktop main menu: the six areas in one row of tabs, each in its own colour. */
export function TopNav() {
  const { pathname } = useLocation();
  const active = sectionFor(pathname)?.id;
  const { lang } = useStudyLanguage();
  const sections = sectionsFor(lang);
  const due = useDueToday();
  return (
    <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto px-1 py-2">
      {sections.map((s) => {
        const on = active === s.id;
        return (
          <NavLink
            key={s.id}
            to={s.to}
            title={s.hint}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              on ? `${TONE[s.tone].tile} ring-1 ${TONE[s.tone].ring}` : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <s.icon className="size-4" aria-hidden />
            {s.label}
            {s.id === 'words' && !!due && (
              <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold leading-[18px] text-white tabular-nums" title={`${due} cards to review today`}>
                {due}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
