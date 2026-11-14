import { BookA, GraduationCap, LineChart, Map, Sun, type LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router-dom';

export interface SectionTab {
  to: string;
  /** Same words as the page's own title, so the menu and the page never disagree. */
  label: string;
  /** other paths that belong to this tab (e.g. the Passage 3 library belongs to Reading) */
  also?: string[];
}

/**
 * The five areas of the app: a rail of icons with labels on the left (desktop), a bar at the bottom (phone).
 * The pages of an area are tabs at the top of the content. Labels are Vietnamese; exam terms (Reading, Writing…) stay English.
 */
export interface Section {
  id: 'home' | 'path' | 'practice' | 'words' | 'progress';
  label: string;
  /** Shorter label for the phone tab bar. */
  short?: string;
  /** One line describing what's inside (tooltip). */
  hint: string;
  to: string;
  icon: LucideIcon;
  /** Path prefixes that belong to this area (for the active state). */
  match: string[];
  tabs?: SectionTab[];
}

export const SECTIONS: Section[] = [
  { id: 'home', label: 'Hôm nay', hint: 'Việc cần làm hôm nay trong lộ trình', to: '/dashboard', icon: Sun, match: ['/dashboard', '/onboarding'] },
  { id: 'path', label: 'Lộ trình', hint: 'Lộ trình IELTS 6.5 đến 15/04/2027', to: '/lo-trinh', icon: Map, match: ['/lo-trinh'] },
  {
    // All exam practice in one place: IELTS Reading · Writing, grammar, free writing and its mistakes.
    id: 'practice',
    label: 'Luyện thi',
    hint: 'Reading · Writing · Ngữ pháp',
    to: '/ielts/reading',
    icon: GraduationCap,
    match: ['/ielts', '/writing', '/grammar'],
    tabs: [
      { to: '/grammar', label: 'Ngữ pháp & dịch câu' },
      { to: '/ielts/reading', label: 'Reading', also: ['/ielts/passage3'] },
      { to: '/writing/guided', label: 'Writing' },
      { to: '/writing', label: 'Viết tự do' },
      { to: '/writing/mistakes', label: 'Lỗi hay lặp lại' },
    ],
  },
  {
    id: 'words',
    label: 'Từ vựng',
    hint: 'Sổ từ, ôn tập, dạng từ',
    to: '/vocabulary',
    icon: BookA,
    match: ['/vocabulary', '/review', '/word-forms'],
    tabs: [
      { to: '/vocabulary', label: 'Sổ từ' },
      { to: '/review', label: 'Ôn tập' },
      { to: '/word-forms', label: 'Dạng từ' },
    ],
  },
  {
    id: 'progress',
    label: 'Tiến độ',
    hint: 'Thống kê, trình độ, điểm yếu',
    to: '/statistics',
    icon: LineChart,
    match: ['/statistics', '/insights'],
    tabs: [
      { to: '/statistics', label: 'Thống kê' },
      { to: '/insights', label: 'Điểm mạnh & yếu' },
    ],
  },
];

/** The tab (page) of an area that a path belongs to: the longest matching prefix, so /writing/guided/x → Writing, not Viết tự do. */
export function tabFor(section: Section | undefined, pathname: string): SectionTab | undefined {
  const hits = (section?.tabs ?? []).flatMap((t) => [t.to, ...(t.also ?? [])].filter((p) => pathname === p || pathname.startsWith(`${p}/`)).map((p) => ({ t, len: p.length })));
  return hits.sort((a, b) => b.len - a.len)[0]?.t;
}

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
}

/** Pages where the learner is doing one task: no menu, nothing else competing for attention. */
const FOCUS_ROUTES = ['/lo-trinh/kiem-tra', '/writing/new/:taskId', '/writing/guided/frame/:typeId', '/writing/guided/:promptId', '/ielts/:testId', '/vocabulary/practice', '/grammar/:topicId', '/ielts/passage3/:setId', '/ielts/passage3/edit/:key'];
/** List pages whose path would otherwise look like a focus route (e.g. /ielts/reading vs /ielts/:testId). */
const LIST_ROUTES = ['/ielts/reading', '/ielts/passage3'];
export const isFocusRoute = (pathname: string) => !LIST_ROUTES.includes(pathname) && FOCUS_ROUTES.some((p) => matchPath(p, pathname));
