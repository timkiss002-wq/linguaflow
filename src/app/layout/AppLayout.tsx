import { X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { BottomNav } from './BottomNav';
import { isFocusRoute, sectionFor } from './nav';
import { SectionTabs } from './SectionTabs';
import { SecondaryNav, SidebarNav } from './SidebarNav';
import { TodayMini } from './TodayMini';
import { UserMenu } from './UserMenu';

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
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-sidebar lg:flex">
        <div className="px-5 pb-4 pt-5">
          <Logo to="/dashboard" />
        </div>
        <div className="px-4 pb-4">
          <TodayMini />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <SidebarNav />
        </div>
        <div className="space-y-2 border-t p-3">
          <SecondaryNav />
          <UserMenu />
        </div>
      </aside>

      {/* Phone: top bar + bottom tabs */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <div className="w-9">
          <UserMenu compact />
        </div>
      </header>
      <BottomNav />

      <main className="min-w-0 pb-24 lg:pb-0" data-section={area}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <SectionTabs />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
