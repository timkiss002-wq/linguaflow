import { Settings, ShieldCheck } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDueToday } from '@/features/dashboard/api';
import { useProfile } from '@/features/profile/api';
import { TONE } from '@/lib/ui/tones';
import { cn } from '@/lib/utils';
import { SECTIONS, sectionFor } from './nav';

/** The five areas, each with its colour and a one-line hint. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const active = sectionFor(pathname)?.id;
  const due = useDueToday();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {SECTIONS.map((s) => {
        const on = active === s.id;
        return (
          <NavLink
            key={s.id}
            to={s.to}
            onClick={onNavigate}
            aria-current={on ? 'page' : undefined}
            className={cn('group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors', on ? `${TONE[s.tone].soft} ring-1 ${TONE[s.tone].ring}` : 'hover:bg-muted')}
          >
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE[s.tone].tile)}>
              <s.icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-sm font-semibold', on ? TONE[s.tone].text : 'text-foreground')}>{s.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
            </span>
            {s.id === 'words' && !!due && (
              <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums" title={`${due} cards to review today`}>
                {due}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

/** Settings and (for admins) Admin, kept apart from learning. */
export function SecondaryNav({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useProfile().data?.role === 'admin';
  const items = [{ to: '/settings', label: 'Settings', icon: Settings }, ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : [])];
  return (
    <nav aria-label="Account" className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm', isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
