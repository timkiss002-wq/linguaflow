import { ArrowLeft, ArrowRight, Languages, Shapes } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CoverArt } from '@/features/passage3/CoverArt';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { chapterOf, comicById, gapItems, KIND_LABEL, resultKey, translateItems, type ComicKind } from '@/lib/comics';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { cn } from '@/lib/utils';

const POS: Record<string, string> = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv', 'phr v': 'phrase' };

/** /truyen/:bookId/:chapterId — one part of the story: summary and key words, then translation and word-form drills. */
export default function ComicChapterPage() {
  const { bookId = '', chapterId = '' } = useParams();
  const book = comicById(bookId);
  const chapter = book && chapterOf(book, chapterId);
  const [kind, setKind] = useState<ComicKind | null>(null);
  const [, setTick] = useState(0);
  const items = useMemo(() => (!chapter || !kind ? [] : kind === 'dich' ? translateItems(chapter) : gapItems(chapter)), [chapter, kind]);

  if (!book || !chapter) {
    return (
      <div className="space-y-3">
        <p>Không tìm thấy phần truyện này.</p>
        <Button asChild variant="outline">
          <Link to="/truyen">Về danh sách truyện</Link>
        </Button>
      </div>
    );
  }
  const index = book.chapters.indexOf(chapter);
  const next = book.chapters[index + 1];

  if (kind) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setKind(null)}>
          <ArrowLeft /> {chapter.title_vi}
        </Button>
        <WriteRunner
          key={kind}
          items={items}
          mode={kind === 'dich' ? 'translate' : 'gap'}
          heading={`${KIND_LABEL[kind]} · ${chapter.title_vi}`}
          storageKey={resultKey(book.id, chapter.id, kind)}
          onFinish={(score, total, _a, passed) => {
            savePractice(resultKey(book.id, chapter.id, kind), score, total, passed);
            setTick((t) => t + 1);
          }}
          extra={
            <Button variant="outline" onClick={() => setKind(kind === 'dich' ? 'loai-tu' : 'dich')}>
              {kind === 'dich' ? KIND_LABEL['loai-tu'] : KIND_LABEL.dich} <ArrowRight />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative h-32 overflow-hidden">
          <CoverArt id={`${book.id}-${chapter.id}`} art={chapter.art} wide className="absolute inset-0 size-full" />
        </div>
        <div className="space-y-2 p-5">
          <p className="text-sm text-muted-foreground">
            {book.title} · Phần {index + 1} · {chapter.month}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{chapter.title_vi}</h1>
          <p className="max-w-3xl leading-relaxed">{chapter.summary_vi}</p>
        </div>
      </header>

      <section aria-labelledby="words" className="space-y-2">
        <h2 id="words" className="font-semibold">
          Từ cần biết trước khi làm
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chapter.words.map((w) => (
            <li key={w.t} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="font-semibold" lang="en">
                {w.t}
              </span>
              {POS[w.p] && <PosBadge pos={POS[w.p]!} />}
              <span className="text-muted-foreground">— {w.m}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="exercises" className="space-y-2">
        <h2 id="exercises" className="font-semibold">
          Bài tập
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <ExerciseCard
            icon={Languages}
            title={KIND_LABEL.dich}
            text={`${chapter.translate.length} câu tiếng Việt kể lại phần truyện này. Dịch sang tiếng Anh; có gợi ý từ và cấu trúc.`}
            result={practiceOf(resultKey(book.id, chapter.id, 'dich'))}
            onStart={() => setKind('dich')}
            primary
          />
          <ExerciseCard
            icon={Shapes}
            title={KIND_LABEL['loai-tu']}
            text={`${chapter.gap.length} câu về truyện, điền đúng dạng của từ trong ngoặc (danh từ, tính từ, động từ, trạng từ).`}
            result={practiceOf(resultKey(book.id, chapter.id, 'loai-tu'))}
            onStart={() => setKind('loai-tu')}
          />
        </div>
      </section>

      <nav className="flex flex-wrap justify-between gap-2 border-t pt-4" aria-label="Chuyển phần">
        <Button asChild variant="ghost">
          <Link to="/truyen">
            <ArrowLeft /> Tất cả các phần
          </Link>
        </Button>
        {next && (
          <Button asChild variant="outline">
            <Link to={`/truyen/${book.id}/${next.id}`}>
              Phần {index + 2}: {next.title_vi} <ArrowRight />
            </Link>
          </Button>
        )}
      </nav>
    </div>
  );
}

function ExerciseCard({
  icon: Icon,
  title,
  text,
  result,
  onStart,
  primary,
}: {
  icon: typeof Languages;
  title: string;
  text: string;
  result?: { best: number; total: number };
  onStart: () => void;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', primary ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' : 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300')}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
          {result && <p className="mt-1 text-xs font-medium text-muted-foreground tabular-nums">Điểm cao nhất: {result.best}/{result.total}</p>}
        </div>
      </div>
      <Button className="self-start" variant={primary ? 'default' : 'outline'} onClick={onStart}>
        {result ? 'Làm lại' : 'Bắt đầu'}
      </Button>
    </div>
  );
}
