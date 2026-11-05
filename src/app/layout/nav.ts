import { BookOpen, Headphones, Home, LineChart, PenLine, type LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router-dom';
import type { Tone } from '@/lib/ui/tones';

export interface SectionTab {
  to: string;
  label: string;
}

/** The five areas of the app. Each groups related pages, shown as tabs at the top of those pages. */
export interface Section {
  id: 'home' | 'lessons' | 'words' | 'writing' | 'progress';
  label: string;
  /** One line under the label in the menu, so learners know what's inside. */
  hint: string;
  to: string;
  icon: LucideIcon;
  tone: Tone;
  /** Path prefixes that belong to this area (for the active state). */
  match: string[];
  tabs?: SectionTab[];
}

export const SECTIONS: Section[] = [
  { id: 'home', label: 'Home', hint: "Today's plan", to: '/dashboard', icon: Home, tone: 'orange', match: ['/dashboard', '/onboarding'] },
  {
    id: 'lessons',
    label: 'Lessons',
    hint: 'Listen & type',
    to: '/lessons',
    icon: Headphones,
    tone: 'teal',
    match: ['/lessons', '/my-learning'],
    tabs: [
      { to: '/lessons', label: 'Explore' },
      { to: '/my-learning', label: 'My lessons' },
    ],
  },
  {
    id: 'words',
    label: 'Words',
    hint: 'Notebook & review',
    to: '/vocabulary',
    icon: BookOpen,
    tone: 'violet',
    match: ['/vocabulary', '/review', '/word-forms'],
    tabs: [
      { to: '/vocabulary', label: 'Notebook' },
      { to: '/review', label: 'Review' },
      { to: '/word-forms', label: 'Word forms' },
    ],
  },
  { id: 'writing', label: 'Writing', hint: 'Write & get feedback', to: '/writing', icon: PenLine, tone: 'rose', match: ['/writing'] },
  {
    id: 'progress',
    label: 'Progress',
    hint: 'Stats, level, weak spots',
    to: '/statistics',
    icon: LineChart,
    tone: 'sky',
    match: ['/statistics', '/insights', '/level-test'],
    tabs: [
      { to: '/statistics', label: 'Statistics' },
      { to: '/insights', label: 'Strengths & Weaknesses' },
      { to: '/level-test', label: 'Level test' },
    ],
  },
];

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
}

/** Pages where the learner is doing one task: no menu, nothing else competing for attention. */
const FOCUS_ROUTES = ['/lessons/:lessonId/practice', '/level-test/:testId', '/writing/new/:taskId', '/vocabulary/practice'];
export const isFocusRoute = (pathname: string) => FOCUS_ROUTES.some((p) => matchPath(p, pathname));
