import { ArrowLeft, ArrowRight, BookText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { loadRun } from '@/lib/practice/retry';
import { dayByDate, formatDay } from '@/lib/roadmap/plan';
import { LEVELS, markStoryDone, recordResults, runKey, storyById, storyFor, storyItems } from '@/lib/translate-daily';

/**
 * /dich-truyen/:date — one short story a day: read the whole story in Vietnamese, translate it sentence by sentence,
 * then read the English version in one piece. Mistakes count towards the same grammar points as the dialogues.
 */
export default function TranslateStoryPage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const [started, setStarted] = useState(false);
  const [, setTick] = useState(0);
  const taskId = `${date}:translate-story`;
  const storageKey = runKey(date, 'story');
  const story = useMemo(() => (day ? storyById(storyFor(date)) : undefined), [day, date]);
  const items = useMemo(() => (story ? storyItems(story.id) : []), [story]);

  if (!day || !story) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;
  const best = practiceOf(taskId);
  const level = LEVELS[story.level - 1]!;

  const vietnamese = (
    <section aria-label="Truyện tiếng Việt" className="rounded-2xl border bg-card p-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-2xl leading-none" aria-hidden>
          {story.scene}
        </span>
        Truyện ngắn · cấp {story.level}
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight">{story.title}</h2>
      <p className="mt-2 max-w-3xl leading-relaxed" lang="vi">
        {story.lines.map((l) => l.vi).join(' ')}
      </p>
    </section>
  );

  if (started)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStarted(false)}>
          <ArrowLeft /> Dịch truyện · {formatDay(date)}
        </Button>
        <details className="rounded-xl border bg-card px-4 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Xem lại cả truyện tiếng Việt</summary>
          <p className="mt-2 leading-relaxed" lang="vi">
            {story.lines.map((l) => l.vi).join(' ')}
          </p>
        </details>
        <WriteRunner
          items={items}
          mode="translate"
          heading={`Dịch truyện · ${story.title}`}
          storageKey={storageKey}
          onFinish={(score, total, _a, passed) => {
            const run = loadRun(storageKey, items);
            recordResults(
              date,
              items.filter((it) => it.key in run.first).map((it) => ({ key: it.key, ok: Boolean(run.first[it.key]) })),
            );
            savePractice(taskId, score, total, passed);
            if (passed) markStoryDone(story.id, date);
            setTick((t) => t + 1);
          }}
          extra={
            <div className="w-full space-y-3">
              <section aria-label="Bản tiếng Anh" className="rounded-xl border bg-emerald-50/60 p-4 dark:bg-emerald-500/10">
                <p className="text-sm font-semibold">Bản tiếng Anh hoàn chỉnh (đáp án mẫu)</p>
                <p className="mt-1 leading-relaxed" lang="en">
                  {story.lines.map((l) => l.en[0]).join(' ')}
                </p>
              </section>
              <Button asChild variant="outline">
                <Link to={`/dich-hoi-thoai/${date}`}>
                  Dịch hội thoại hôm nay <ArrowRight />
                </Link>
              </Button>
            </div>
          }
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Dịch hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Dịch truyện ngắn</h1>
        <p className="max-w-3xl text-muted-foreground">
          Đọc cả truyện trước để nắm mạch, rồi dịch từng câu ({items.length} câu). Câu nào sai lần đầu sẽ được tính vào “lỗi hay mắc” và quay lại ở phần ôn của bài hội thoại. Truyện khó dần theo cấp: {level.focus.toLowerCase()}.
        </p>
      </header>

      {vietnamese}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setStarted(true)} autoFocus data-testid="start-story">
          <BookText /> {best ? 'Làm lại' : 'Bắt đầu dịch'} · {items.length} câu
        </Button>
        {best && (
          <span className="text-sm text-muted-foreground tabular-nums">
            Đúng ngay lần đầu: {best.best}/{best.total}
          </span>
        )}
      </div>
    </div>
  );
}
