import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DailyGoalReminder } from '@/features/review/DailyGoalReminder';
import { useStudyLanguage } from '@/features/study/context';
import { DailyChoice } from '@/features/study/DailyChoice';
import { StudyLanguageProvider } from '@/features/study/StudyLanguageProvider';
import { StudySwitch } from '@/features/study/StudySwitch';
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
  return (
    <StudyLanguageProvider>
      <Shell />
    </StudyLanguageProvider>
  );
}

function Shell() {
  const { pathname, search } = useLocation();
  const area = sectionFor(pathname)?.id;
  const { lang, setLang } = useStudyLanguage();
  // old links such as /writing?lang=zh open in that language
  const linked = new URLSearchParams(search).get('lang');
  useEffect(() => {
    if ((linked === 'en' || linked === 'zh') && linked !== lang) setLang(linked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked]);
  // A link straight to a page of the other language (e.g. an IELTS test while studying Chinese) switches the language.
  useEffect(() => {
    const s = sectionFor(pathname);
    const tab = s?.tabs?.find((t) => pathname === t.to || pathname.startsWith(`${t.to}/`));
    const only = s?.only ?? tab?.only;
    if (only && only !== lang) setLang(only);
  }, [pathname, lang, setLang]);

  // Doing one task (dictation, a test, writing, typing practice): no menu, just a way out.
  if (isFocusRoute(pathname)) {
    const section = sectionFor(pathname);
    // back to the page this task was opened from (e.g. /grammar/passive → /grammar), else the area's first page
    const exit = section?.tabs?.filter((t) => pathname.startsWith(`${t.to}/`)).sort((a, b) => b.to.length - a.to.length)[0]?.to ?? section?.to ?? '/dashboard';
    return (
      <div className="min-h-screen" data-section={area}>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Logo to="/dashboard" />
          <Button asChild variant="ghost" size="sm">
            <Link to={exit} aria-label="Leave focus mode">
              <X /> Exit
            </Link>
          </Button>
        </header>
        {/* IELTS tests get the whole screen: passage and questions side by side. */}
        <main className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:py-8', pathname.startsWith('/ielts/') ? 'max-w-[1600px] lg:py-5' : 'max-w-5xl')}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo to="/dashboard" className="[&>span]:hidden sm:[&>span]:inline" />
          <div className="mx-auto">
            <StudySwitch />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <TodayChip />
            </span>
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
      {/* Daily vocabulary goal: shown everywhere until 10 new words are learned (the Review page has its own card). */}
      {pathname !== '/review' && <DailyGoalReminder />}
      <BottomNav />
      <DailyChoice />

      <main className="min-w-0 pb-24 lg:pb-0" data-section={area}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
