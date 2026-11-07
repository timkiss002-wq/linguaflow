import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DailyGoalReminder } from '@/features/review/DailyGoalReminder';
import { STUDY_LABEL, useStudyLanguage } from '@/features/study/context';
import { StudyLanguageProvider } from '@/features/study/StudyLanguageProvider';
import { StudySwitch } from '@/features/study/StudySwitch';
import { BottomNav } from './BottomNav';
import { isFocusRoute, sectionFor, tabFor } from './nav';
import { SectionTabs } from './SectionTabs';
import { TopNav } from './TopNav';
import { TodayChip } from './TodayMini';
import { UserMenu } from './UserMenu';

/**
 * Top-menu layout (no sidebar), so pages get the full width.
 * Desktop: ONE row — logo · the five areas (pages in a drop-down) · language · today · account.
 * It slides away while scrolling down and comes back on scroll up, so content gets the screen.
 * Phones: logo row + the area's pages as tabs; areas in the bottom bar.
 */
export function AppLayout() {
  return (
    <StudyLanguageProvider>
      <Shell />
    </StudyLanguageProvider>
  );
}

/** Hide the header while the learner scrolls down; show it again as soon as they scroll up. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last.current) < 6) return;
      setHidden(y > 120 && y > last.current);
      last.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

function Shell() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const area = sectionFor(pathname)?.id;
  const { lang, setLang } = useStudyLanguage();
  const hidden = useHideOnScroll();
  // old links such as /writing?lang=zh open in that language
  const linked = new URLSearchParams(search).get('lang');
  useEffect(() => {
    if ((linked === 'en' || linked === 'zh') && linked !== lang) setLang(linked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked]);
  // A link straight to a page of the other language (e.g. an IELTS test while studying Chinese) switches the language —
  // and says so, with a way back, instead of changing the whole app silently.
  useEffect(() => {
    const s = sectionFor(pathname);
    const only = s?.only ?? tabFor(s, pathname)?.only;
    if (!only || only === lang) return;
    const from = lang;
    setLang(only);
    toast(`Đã chuyển sang học ${STUDY_LABEL[only].name.toLowerCase()}`, {
      id: 'study-switch',
      description: `Trang này chỉ có cho ${STUDY_LABEL[only].name.toLowerCase()}.`,
      action: { label: `Về ${STUDY_LABEL[from].name}`, onClick: () => (setLang(from), navigate('/dashboard')) },
    });
  }, [pathname, lang, setLang, navigate]);

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
            <Link to={exit} aria-label="Thoát chế độ tập trung">
              <X /> Thoát
            </Link>
          </Button>
        </header>
        {/* The exam rooms (IELTS tests, Writing exam) cover this whole layout with their own full-screen frame. */}
        <main className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:py-8', pathname.startsWith('/ielts/') ? 'max-w-[1600px] lg:py-5' : 'max-w-5xl')}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className={cn('sticky top-0 z-40 border-b bg-background/95 backdrop-blur transition-transform duration-200', hidden && '-translate-y-full')} data-testid="app-header">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo to="/dashboard" className="shrink-0 [&>span]:hidden sm:[&>span]:inline lg:[&>span]:hidden xl:[&>span]:inline" />
          <div className="hidden min-w-0 flex-1 lg:block">
            <TopNav />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <StudySwitch compact />
            {/* the home page shows streak and minutes in its own hero — don't show them twice */}
            {pathname !== '/dashboard' && (
              <span className="hidden sm:block lg:hidden xl:block">
                <TodayChip />
              </span>
            )}
            <div className="w-10">
              <UserMenu compact />
            </div>
          </div>
        </div>
        <SectionTabs />
      </header>
      {/* Daily vocabulary goal: only on the home page (the Review page has its own card), not on every page. */}
      {pathname === '/dashboard' && <DailyGoalReminder />}
      <BottomNav />

      <main className="min-w-0 pb-24 lg:pb-0" data-section={area}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
