import { NavLink } from 'react-router-dom';
import { useProfile } from '@/features/profile/api';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useProfile().data?.role === 'admin';
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin).map(({ to, label, icon: Icon, available }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">{label}</span>
          {!available && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">Soon</span>}
        </NavLink>
      ))}
    </nav>
  );
}
