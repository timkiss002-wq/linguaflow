import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { STUDY_LABEL, useStudyLanguage } from './context';

/** First visit of the day: "Hôm nay bạn học gì?" — two big choices. Closing keeps yesterday's language. */
export function DailyChoice() {
  const { lang, setLang, chosenToday } = useStudyLanguage();
  // automated browsers (the e2e tests) are not asked
  if (typeof navigator !== 'undefined' && navigator.webdriver) return null;
  return (
    <Dialog open={!chosenToday} onOpenChange={(open) => !open && setLang(lang)}>
      <DialogContent className="max-w-lg" data-testid="daily-choice">
        <DialogTitle className="text-2xl">Hôm nay bạn học gì?</DialogTitle>
        <DialogDescription>Cả trang web sẽ chỉ hiện bài học, từ vựng và bài luyện của ngôn ngữ bạn chọn. Đổi lúc nào cũng được ở góc trên.</DialogDescription>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(['en', 'zh'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md',
                l === 'en' ? 'border-sky-200 bg-sky-50 hover:border-sky-500 dark:border-sky-500/30 dark:bg-sky-500/10' : 'border-red-200 bg-red-50 hover:border-red-500 dark:border-red-500/30 dark:bg-red-500/10',
                lang === l && 'ring-2 ring-offset-2 ' + (l === 'en' ? 'ring-sky-500' : 'ring-red-500'),
              )}
              data-choice={l}
            >
              <span className={cn('flex size-12 items-center justify-center rounded-xl text-xl font-black text-white', l === 'en' ? 'bg-sky-600' : 'bg-red-600')} aria-hidden>
                {STUDY_LABEL[l].flag}
              </span>
              <span className="text-lg font-bold">
                {STUDY_LABEL[l].name} <span className="font-medium text-muted-foreground">· {STUDY_LABEL[l].native}</span>
              </span>
              <span className="text-sm text-muted-foreground">{STUDY_LABEL[l].blurb}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
