import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDueToday } from '@/features/dashboard/api';
import { useStudyLanguage } from '@/features/study/context';
import { cn } from '@/lib/utils';
import { sectionFor, sectionsFor, tabFor } from './nav';

/**
 * Desktop main menu, one row: the five areas. An area with several pages has a ▾ that lists them,
 * and the active area shows which of its pages you are on — so there is no second row of tabs.
 * One accent colour (primary) for the active area, not one colour per area.
 */
export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const found = sectionFor(pathname);
  const { lang } = useStudyLanguage();
  const sections = sectionsFor(lang);
  const due = useDueToday();
  return (
    <nav aria-label="Menu chính" className="flex min-w-0 items-center gap-0.5">
      {sections.map((s) => {
        const on = found?.id === s.id;
        const tab = on ? tabFor(s, pathname) : undefined;
        const many = (s.tabs?.length ?? 0) > 1;
        return (
          <div key={s.id} className={cn('flex shrink-0 items-center rounded-full transition-colors', on ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <NavLink to={s.to} title={s.hint} aria-current={on ? 'page' : undefined} className={cn('flex items-center gap-1.5 py-1.5 pl-3 text-sm font-medium', many ? 'pr-1' : 'pr-3', on && 'font-semibold')}>
              <s.icon className="size-4" aria-hidden />
              {s.label}
              {on && tab && many && <span className="font-normal text-primary/80">· {tab.label}</span>}
              {s.id === 'words' && !!due && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-[18px] text-primary-foreground tabular-nums" title={`${due} thẻ cần ôn hôm nay`}>
                  {due}
                </span>
              )}
            </NavLink>
            {many && (
              <DropdownMenu>
                <DropdownMenuTrigger className="mr-1 rounded-full p-1 hover:bg-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Các trang trong ${s.label}`}>
                  <ChevronDown className="size-3.5" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-48">
                  {s.tabs!.map((t) => (
                    <DropdownMenuItem key={t.to} onSelect={() => navigate(t.to)} className={cn(tab?.to === t.to && 'font-semibold text-primary')} aria-current={tab?.to === t.to ? 'page' : undefined}>
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </nav>
  );
}
