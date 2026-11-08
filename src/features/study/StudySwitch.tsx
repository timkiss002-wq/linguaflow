import { useLocation, useNavigate } from 'react-router-dom';
import { sectionFor, tabFor } from '@/app/layout/nav';
import { cn } from '@/lib/utils';
import { STUDY_LABEL, useStudyLanguage, type StudyLanguage } from './context';

/** "Hôm nay học: English | 中文" — always in the top bar. Switching hides everything of the other language. */
export function StudySwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useStudyLanguage();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pick = (l: StudyLanguage) => {
    if (l === lang) return;
    setLang(l);
    // a page that only exists for the other language (IELTS, word forms…) → home
    const s = sectionFor(pathname);
    const tab = tabFor(s, pathname);
    if ((s?.only && s.only !== l) || (tab?.only && tab.only !== l)) navigate('/dashboard');
  };
  return (
    <div className="flex items-center gap-2" data-testid="study-switch">
      {!compact && <span className="hidden text-sm font-medium text-muted-foreground md:inline">Hôm nay học</span>}
      <div className="flex rounded-full border bg-muted/60 p-0.5" role="radiogroup" aria-label="Hôm nay học ngôn ngữ nào">
        {(['en', 'zh'] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={lang === l}
            onClick={() => pick(l)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition',
              lang === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span aria-hidden className="rounded bg-muted px-1 text-[11px] font-bold leading-4 text-muted-foreground">
              {STUDY_LABEL[l].flag}
            </span>
            <span className={cn(compact && lang !== l && 'sr-only sm:not-sr-only')}>{compact ? STUDY_LABEL[l].native : STUDY_LABEL[l].name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
