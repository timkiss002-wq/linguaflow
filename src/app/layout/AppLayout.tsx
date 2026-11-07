import { X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { BottomNav } from './BottomNav';
import { isFocusRoute, sectionFor } from './nav';
import { SectionTabs } from './SectionTabs';
import { TopNav } from './TopNav';
import { TodayChip } from './TodayMini';
import { UserMenu } from './UserMenu';

/**
 * Top-menu layout (no sidebar), so pages get the full width:
 *   row 1 — logo, today's streak, account
 *   row 2 — the six areas as tabs (desktop; phones use the bottom bar)
 *   row 3 — the pages of the current area (Reading · Listening · Writing …)
 * All three rows stick to the top while scrolling.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const area = sectionFor(pathname)?.id;

  // Doing one task (dictation, a test, writing, typing practice): no menu, just a way out.
  if (isFocusRoute(pathname)) {
    const section = sectionFor(pathname);
    return (
      <div className="min-h-screen" data-section={area}>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Logo to="/dashboard" />
          <Button asChild variant="ghost" size="sm">
            <Link to={section?.to ?? '/dashboard'} aria-label="Leave focus mode">
              <X /> Exit
            </Link>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo to="/dashboard" />
          <div className="ml-auto flex items-center gap-2">
            <TodayChip />
            <div className="w-10">
              <UserMenu compact />
            </div>
          </div>
        </div>
        <div className="hidden border-t lg:block">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <TopNav />
          </div>
        </div>
        <SectionTabs />
      </header>
      <BottomNav />

      <main className="min-w-0 pb-24 lg:pb-0" data-section={area}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
