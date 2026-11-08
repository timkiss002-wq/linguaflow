import { BookA, GraduationCap, LineChart, Sun, type LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router-dom';

export interface SectionTab {
  to: string;
  /** Same words as the page's own title, so the menu and the page never disagree. */
  label: string;
  /** shown only while studying this language */
  only?: 'en' | 'zh';
  /** other paths that belong to this tab (e.g. the Passage 3 library belongs to Reading) */
  also?: string[];
}

/**
 * The four areas of the app: a rail of icons with labels on the left (desktop), a bar at the bottom (phone).
 * The pages of an area are tabs at the top of the content. Labels are Vietnamese; exam terms (Reading, Writing…) stay English.
 */
export interface Section {
  id: 'home' | 'practice' | 'words' | 'progress';
  label: string;
  /** label while studying Chinese, when it differs (no IELTS for Chinese) */
  labelZh?: string;
  /** Shorter label for the phone tab bar. */
  short?: string;
  /** One line describing what's inside (tooltip). */
  hint: string;
  to: string;
  /** first page while studying Chinese, when it differs */
  toZh?: string;
  icon: LucideIcon;
  /** Path prefixes that belong to this area (for the active state). */
  match: string[];
  tabs?: SectionTab[];
  /** the whole area exists for one language only */
  only?: 'en' | 'zh';
}

export const SECTIONS: Section[] = [
  { id: 'home', label: 'Hôm nay', hint: 'Việc cần làm hôm nay', to: '/dashboard', icon: Sun, match: ['/dashboard', '/onboarding'] },
  {
    // All exam practice in one place: IELTS Reading · Listening · Writing, grammar, free writing and its mistakes.
    id: 'practice',
    label: 'Luyện thi',
    labelZh: 'Luyện viết',
    hint: 'Reading · Listening · Writing · Ngữ pháp',
    to: '/ielts/reading',
    toZh: '/writing',
    icon: GraduationCap,
    match: ['/ielts', '/writing', '/grammar'],
    tabs: [
      { to: '/ielts/reading', label: 'Reading', only: 'en', also: ['/ielts/passage3'] },
      { to: '/ielts/listening', label: 'Listening', only: 'en' },
      { to: '/writing/guided', label: 'Writing', only: 'en' },
      { to: '/writing', label: 'Viết tự do' },
      { to: '/writing/mistakes', label: 'Lỗi hay lặp lại', only: 'en' },
      { to: '/grammar', label: 'Ngữ pháp & dịch câu', only: 'en' },
    ],
  },
  {
    id: 'words',
    label: 'Từ vựng',
    hint: 'Sổ từ, ôn tập, nghe chép',
    to: '/vocabulary',
    icon: BookA,
    match: ['/vocabulary', '/review', '/word-forms', '/lessons', '/my-learning'],
    tabs: [
      { to: '/vocabulary', label: 'Sổ từ' },
      { to: '/review', label: 'Ôn tập' },
      { to: '/word-forms', label: 'Dạng từ', only: 'en' },
      { to: '/lessons', label: 'Nghe chép' },
      { to: '/my-learning', label: 'Bài nghe của tôi' },
    ],
  },
  {
    id: 'progress',
    label: 'Tiến độ',
    hint: 'Thống kê, trình độ, điểm yếu',
    to: '/statistics',
    icon: LineChart,
    match: ['/statistics', '/insights', '/level-test'],
    tabs: [
      { to: '/statistics', label: 'Thống kê' },
      { to: '/insights', label: 'Điểm mạnh & yếu' },
      { to: '/level-test', label: 'Kiểm tra trình độ' },
    ],
  },
];

/** The areas (and their tabs) for the language being studied. */
export function sectionsFor(lang: 'en' | 'zh'): Section[] {
  return SECTIONS.filter((s) => !s.only || s.only === lang).map((s) => ({
    ...s,
    label: lang === 'zh' ? (s.labelZh ?? s.label) : s.label,
    to: lang === 'zh' ? (s.toZh ?? s.to) : s.to,
    tabs: s.tabs?.filter((t) => !t.only || t.only === lang),
  }));
}

/** The tab (page) of an area that a path belongs to: the longest matching prefix, so /writing/guided/x → Writing, not Viết tự do. */
export function tabFor(section: Section | undefined, pathname: string): SectionTab | undefined {
  const hits = (section?.tabs ?? []).flatMap((t) => [t.to, ...(t.also ?? [])].filter((p) => pathname === p || pathname.startsWith(`${p}/`)).map((p) => ({ t, len: p.length })));
  return hits.sort((a, b) => b.len - a.len)[0]?.t;
}

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
}

/** Pages where the learner is doing one task: no menu, nothing else competing for attention. */
const FOCUS_ROUTES = ['/lessons/:lessonId/practice', '/level-test/:testId', '/writing/new/:taskId', '/writing/guided/frame/:typeId', '/writing/guided/:promptId', '/ielts/:testId', '/vocabulary/practice', '/grammar/:topicId', '/ielts/passage3/:setId', '/ielts/passage3/edit/:key'];
/** List pages whose path would otherwise look like a focus route (e.g. /ielts/reading vs /ielts/:testId). */
const LIST_ROUTES = ['/ielts/reading', '/ielts/listening', '/ielts/passage3'];
export const isFocusRoute = (pathname: string) => !LIST_ROUTES.includes(pathname) && FOCUS_ROUTES.some((p) => matchPath(p, pathname));
