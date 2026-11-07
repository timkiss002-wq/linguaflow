import { NavLink, useLocation } from 'react-router-dom';
import { TONE } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';
import { sectionFor } from './nav';

/** Pages of the current area (e.g. IELTS: Reading · Listening · Writing), centred under the menu, active one underlined. */
export function SectionTabs() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);
  if (!section?.tabs || !section.tabs.some((t) => t.to === pathname)) return null;
  return (
    <div className="border-t bg-background">
      <nav aria-label={`${section.label} pages`} className="mx-auto flex w-full max-w-7xl justify-start gap-1 overflow-x-auto px-4 sm:justify-center sm:px-6">
        {section.tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                '-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive ? `${TONE[section.tone].text} border-current` : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
