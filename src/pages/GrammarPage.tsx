import { CheckCircle2, Languages } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GrammarDiagram } from '@/features/grammar/GrammarDiagram';
import { TOPICS, readProgress } from '@/lib/grammar/drills';
import { cn } from '@/lib/utils';

/** Grammar topics, each a short lesson + 8 sentences to translate from Vietnamese into English. */
export default function GrammarPage() {
  const progress = useMemo(readProgress, []);
  const done = TOPICS.filter((t) => progress[t.id]).length;
  const bands = [...new Set(TOPICS.map((t) => t.band))].sort();
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-teal-500/30 dark:from-teal-500/10 dark:via-emerald-500/5 dark:to-sky-500/10">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Languages className="size-5" aria-hidden />
          </span>
          <div className="text-sm">
            <h1 className="text-lg font-bold">Ngữ pháp & dịch câu</h1>
            <p className="text-muted-foreground">
              Mỗi chủ điểm: xem hình minh hoạ và công thức, rồi dịch 8 câu tiếng Việt sang tiếng Anh. Câu dịch được chấm từng từ và so với nhiều đáp án đúng. Dành cho band 4.5 → 5.5 — nền để viết Task 1 và Task 2.
            </p>
          </div>
        </div>
        <p className="shrink-0 text-sm font-medium">
          Đã luyện {done}/{TOPICS.length} chủ điểm
        </p>
      </div>

      {bands.map((band) => (
        <section key={band} className="mb-8" aria-labelledby={`band-${band}`}>
          <h2 id={`band-${band}`} className="mb-3 flex items-baseline gap-2 text-lg font-semibold">
            Band {band}
            <span className="text-sm font-normal text-muted-foreground">{band === '4.5' ? 'nền tảng — nên làm trước' : band === '5.0' ? 'câu phức hơn' : 'cần cho Writing 5.5–6.5'}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {TOPICS.filter((t) => t.band === band).map((t) => {
              const p = progress[t.id];
              const full = p && p.best === p.total;
              return (
                <Link
                  key={t.id}
                  to={`/grammar/${t.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-topic={t.id}
                >
                  <div className="relative border-b bg-muted/40 px-6 pb-2 pt-4">
                    <GrammarDiagram kind={t.diagram} className="mx-auto max-h-28" />
                    {p && (
                      <span className={cn('absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', full ? 'bg-emerald-600 text-white' : 'bg-background text-foreground ring-1 ring-border')}>
                        {full && <CheckCircle2 className="size-3" aria-hidden />} {p.best}/{p.total}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="font-semibold group-hover:text-teal-700 dark:group-hover:text-teal-300">{t.title_vi}</p>
                    <p className="text-xs text-muted-foreground">{t.title_en}</p>
                    <p className="text-sm text-muted-foreground">{t.summary_vi}</p>
                    <p className="mt-auto pt-2 text-xs font-medium text-teal-700 dark:text-teal-300">{p ? 'Luyện lại →' : `Học & dịch ${t.items.length} câu →`}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
