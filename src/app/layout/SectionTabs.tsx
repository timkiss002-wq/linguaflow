import { NavLink, useLocation } from 'react-router-dom';
import { TONE } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';
import { sectionFor } from './nav';

/** Tabs between the pages of one area (e.g. Words: Notebook · Review · Word forms). Only on those pages. */
export function SectionTabs() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);
  if (!section?.tabs || !section.tabs.some((t) => t.to === pathname)) return null;
  return (
    <nav aria-label={`${section.label} pages`} className="-mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
      {section.tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors', isActive ? TONE[section.tone].solid : 'bg-card text-muted-foreground ring-1 ring-border hover:text-foreground')
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
