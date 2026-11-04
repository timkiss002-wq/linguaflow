import { BarChart3, BookOpen, Compass, GraduationCap, LayoutDashboard, Layers, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown as "Soon" until the feature ships. */
  available: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, available: true },
  { to: '/lessons', label: 'Explore Lessons', icon: Compass, available: true },
  { to: '/my-learning', label: 'My Learning', icon: GraduationCap, available: true },
  { to: '/vocabulary', label: 'Vocabulary', icon: BookOpen, available: true },
  { to: '/review', label: 'Review', icon: Layers, available: false },
  { to: '/statistics', label: 'Statistics', icon: BarChart3, available: false },
  { to: '/settings', label: 'Settings', icon: Settings, available: true },
];
