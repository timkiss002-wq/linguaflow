import { BookOpenText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CoverArt } from '@/features/passage3/CoverArt';
import { COMICS, KIND_LABEL, resultKey, type ComicKind } from '@/lib/comics';
import { practiceOf, practicePassed } from '@/lib/practice/results';
import { cn } from '@/lib/utils';

const KINDS: ComicKind[] = ['dich', 'loai-tu'];

/** /truyen — practice built around comic books the learner reads: one card per part of the story. */
export default function ComicsPage() {
  return (
    <div className="space-y-8">
      {COMICS.map((book) => {
        const passed = book.chapters.filter((c) => KINDS.every((k) => practicePassed(resultKey(book.id, c.id, k)))).length;
        return (
          <section key={book.id} aria-labelledby={`b-${book.id}`} className="space-y-4">
            <header className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <BookOpenText className="size-5" aria-hidden />
                </span>
                <div>
                  <h1 id={`b-${book.id}`} className="text-2xl font-bold tracking-tight">
                    {book.title}
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{book.note_vi}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Mức độ: {book.level}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums" data-testid="comic-progress">
                Xong {passed}/{book.chapters.length} phần
              </p>
            </header>

            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {book.chapters.map((c, i) => {
                const done = KINDS.filter((k) => practicePassed(resultKey(book.id, c.id, k)));
                return (
                  <li key={c.id}>
                    <Link
                      to={`/truyen/${book.id}/${c.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      data-chapter={c.id}
                    >
                      <div className="relative h-28 overflow-hidden">
                        <CoverArt id={`${book.id}-${c.id}`} art={c.art} wide className="absolute inset-0 size-full" />
                        <span className="absolute bottom-0 left-0 rounded-tr-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                          Phần {i + 1} · {c.month}
                        </span>
                        {done.length === KINDS.length && (
                          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                            <CheckCircle2 className="size-3.5" aria-hidden /> Đã xong
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <p className="font-semibold group-hover:text-primary">{c.title_vi}</p>
                        <p className="line-clamp-3 text-sm text-muted-foreground">{c.summary_vi}</p>
                        <ul className="mt-auto space-y-1 pt-2 text-xs">
                          {KINDS.map((k) => {
                            const r = practiceOf(resultKey(book.id, c.id, k));
                            const ok = practicePassed(resultKey(book.id, c.id, k));
                            return (
                              <li key={k} className={cn('flex justify-between', ok ? 'text-success' : 'text-muted-foreground')}>
                                <span>{KIND_LABEL[k]}</span>
                                <span className="tabular-nums">{r ? `${r.best}/${r.total}` : 'chưa làm'}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
