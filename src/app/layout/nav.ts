import { BookOpen, GraduationCap, Headphones, Home, LineChart, type LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router-dom';

export interface SectionTab {
  to: string;
  /** Same words as the page's own title, so the menu and the page never disagree. */
  label: string;
  /** shown only while studying this language */
  only?: 'en' | 'zh';
}

/**
 * The five areas of the app, in one row at the top. The pages of each area open from a drop-down on that area
 * (desktop) or a row of tabs under the header (phone). Labels are Vietnamese; exam terms (Reading, Writing…) stay English.
 */
export interface Section {
  id: 'home' | 'practice' | 'lessons' | 'words' | 'progress';
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
  { id: 'home', label: 'Trang chủ', hint: 'Kế hoạch hôm nay', to: '/dashboard', icon: Home, match: ['/dashboard', '/onboarding'] },
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
      { to: '/ielts/reading', label: 'Reading', only: 'en' },
      { to: '/ielts/passage3', label: 'Passage 3 hằng ngày', only: 'en' },
      { to: '/ielts/listening', label: 'Listening', only: 'en' },
      { to: '/writing/guided', label: 'Writing', only: 'en' },
      { to: '/writing', label: 'Viết tự do' },
      { to: '/writing/mistakes', label: 'Lỗi hay lặp lại', only: 'en' },
      { to: '/grammar', label: 'Ngữ pháp & dịch câu', only: 'en' },
    ],
  },
  {
    id: 'lessons',
    label: 'Bài nghe',
    hint: 'Nghe và chép chính tả',
    to: '/lessons',
    icon: Headphones,
    match: ['/lessons', '/my-learning'],
    tabs: [
      { to: '/lessons', label: 'Kho bài nghe' },
      { to: '/my-learning', label: 'Bài của tôi' },
    ],
  },
  {
    id: 'words',
    label: 'Từ vựng',
    hint: 'Sổ từ và ôn tập',
    to: '/vocabulary',
    icon: BookOpen,
    match: ['/vocabulary', '/review', '/word-forms'],
    tabs: [
      { to: '/vocabulary', label: 'Sổ từ' },
      { to: '/review', label: 'Ôn tập' },
      { to: '/word-forms', label: 'Dạng từ', only: 'en' },
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
  return section?.tabs?.filter((t) => pathname === t.to || pathname.startsWith(`${t.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
}

export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.find((s) => s.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
}

/** Pages where the learner is doing one task: no menu, nothing else competing for attention. */
const FOCUS_ROUTES = ['/lessons/:lessonId/practice', '/level-test/:testId', '/writing/new/:taskId', '/writing/guided/frame/:typeId', '/writing/guided/:promptId', '/ielts/:testId', '/vocabulary/practice', '/grammar/:topicId', '/ielts/passage3/:setId', '/ielts/passage3/edit/:key'];
/** List pages whose path would otherwise look like a focus route (e.g. /ielts/reading vs /ielts/:testId). */
const LIST_ROUTES = ['/ielts/reading', '/ielts/listening', '/ielts/passage3'];
export const isFocusRoute = (pathname: string) => !LIST_ROUTES.includes(pathname) && FOCUS_ROUTES.some((p) => matchPath(p, pathname));
