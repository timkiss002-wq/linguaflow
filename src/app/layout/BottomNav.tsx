import { NavLink, useLocation } from 'react-router-dom';
import { TONE } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';
import { useStudyLanguage } from '@/features/study/context';
import { sectionFor, sectionsFor } from './nav';

/** Phone navigation: the six areas as a tab bar at the bottom, within thumb reach. */
export function BottomNav() {
  const { pathname } = useLocation();
  const active = sectionFor(pathname)?.id;
  const { lang } = useStudyLanguage();
  const sections = sectionsFor(lang);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className={cn('grid', sections.length === 6 ? 'grid-cols-6' : 'grid-cols-5')}>
        {sections.map((s) => {
          const on = active === s.id;
          return (
            <li key={s.id}>
              <NavLink to={s.to} aria-current={on ? 'page' : undefined} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium">
                <span className={cn('flex h-7 w-10 items-center justify-center rounded-full transition-colors', on ? TONE[s.tone].tile : 'text-muted-foreground')}>
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className={on ? TONE[s.tone].text : 'text-muted-foreground'}>{s.short ?? s.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
