import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { SidebarNav } from './SidebarNav';
import { UserMenu } from './UserMenu';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-sidebar lg:flex">
        <div className="px-5 py-5">
          <Logo to="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-sidebar/95 px-4 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>
        <Logo to="/dashboard" />
        <div className="w-9">
          <UserMenu compact />
        </div>
      </header>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetTitle className="px-5 py-5">
            <Logo to="/dashboard" />
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <div className="flex-1 overflow-y-auto px-3">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
