import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStudyLanguage } from '@/features/study/context';
import { sectionFor, sectionsFor } from './nav';

/** Phones and tablets only: the pages of the current area as tabs under the header (desktop uses the drop-down in the menu). */
export function SectionTabs() {
  const { pathname } = useLocation();
  const { lang } = useStudyLanguage();
  const found = sectionFor(pathname);
  const section = found && sectionsFor(lang).find((s) => s.id === found.id);
  if (!section?.tabs || section.tabs.length < 2 || !section.tabs.some((t) => t.to === pathname)) return null;
  return (
    <div className="border-t bg-background lg:hidden">
      <nav aria-label={`Các trang trong ${section.label}`} className="mx-auto flex w-full max-w-7xl justify-start gap-1 overflow-x-auto px-4 sm:px-6">
        {section.tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn('-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors', isActive ? 'border-current text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
