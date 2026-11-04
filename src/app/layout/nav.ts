import { BarChart3, BookOpen, ClipboardCheck, Compass, GraduationCap, LayoutDashboard, Layers, Lightbulb, PenLine, Settings, Shapes, type LucideIcon } from 'lucide-react';

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
  { to: '/word-forms', label: 'Word Forms', icon: Shapes, available: true },
  { to: '/review', label: 'Review', icon: Layers, available: true },
  { to: '/statistics', label: 'Statistics', icon: BarChart3, available: true },
  { to: '/writing', label: 'Writing', icon: PenLine, available: true },
  { to: '/level-test', label: 'Level Test', icon: ClipboardCheck, available: true },
  { to: '/insights', label: 'Strengths & Weaknesses', icon: Lightbulb, available: true },
  { to: '/settings', label: 'Settings', icon: Settings, available: true },
];
