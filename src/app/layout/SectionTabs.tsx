import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { sectionFor, SECTIONS, tabFor } from './nav';
import { TodayChip } from './TodayMini';

/**
 * The bar at the top of the content: the pages of the current area as tabs on the left, and today's streak on the right. An area with one page shows its name instead of tabs.
 */
export function TopBar() {
  const { pathname } = useLocation();
  const found = sectionFor(pathname);
  const section = found && SECTIONS.find((s) => s.id === found.id);
  const current = tabFor(section, pathname);
  const tabs = section?.tabs ?? [];
  return (
    <div className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur" data-testid="top-bar">
      <div className="flex h-12 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {tabs.length > 1 ? (
          <nav aria-label={`Các trang trong ${section!.label}`} className="-mb-px flex h-full min-w-0 flex-1 gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                aria-current={current?.to === t.to ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  current?.to === t.to ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        ) : (
          <p className="flex-1 text-sm font-semibold">{section?.label ?? ''}</p>
        )}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden sm:block">
            <TodayChip />
          </span>
        </div>
      </div>
    </div>
  );
}
