import { useMutation } from '@tanstack/react-query';
import { LogOut, Monitor, Moon, Settings, ShieldCheck, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme/useTheme';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from '@/features/auth/api';
import { useUser } from '@/features/auth/useAuth';
import { useProfile } from '@/features/profile/api';
import { toUserMessage } from '@/lib/errors';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useUser();
  const { data: profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: signOut,
    onSuccess: () => navigate('/', { replace: true }),
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const name = profile?.display_name ?? user.email ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Tài khoản">
        <Avatar>
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> Cài đặt
        </DropdownMenuItem>
        {profile?.role === 'admin' && (
          <DropdownMenuItem onSelect={() => navigate('/admin')}>
            <ShieldCheck /> Quản trị
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Giao diện</DropdownMenuLabel>
        {([
          ['light', 'Sáng', Sun],
          ['dark', 'Tối', Moon],
          ['system', 'Theo hệ thống', Monitor],
        ] as const).map(([value, label, Icon]) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)} className={theme === value ? 'font-semibold text-primary' : undefined}>
            <Icon /> {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
