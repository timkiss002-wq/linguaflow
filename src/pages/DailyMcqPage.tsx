import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { McqRunner } from '@/features/daily/McqRunner';
import { DAILY_START, currentTopic, dailyAmount, frozenSet, grammarSet, openTopics, readWrong, sharedWeakTopics, wordFormSet, type Mcq } from '@/lib/practice-daily';
import { WeakPoints } from '@/features/daily/WeakPoints';
import { savePractice, practiceOf } from '@/lib/practice/results';
import { dayByDate, daysBetween, formatDay } from '@/lib/roadmap/plan';

/** /trac-nghiem/:date — the day's multiple choice: grammar (newest topic + review + earlier mistakes), then word forms. */
export default function DailyMcqPage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const [started, setStarted] = useState(false);
  const taskId = `${date}:grammar-mcq`;
  const phase = day?.phase ?? 1;
  const items = useMemo<Mcq[]>(() => {
    if (!day) return [];
    const ids = frozenSet(`daily:set:${taskId}`, () => {
      const wrong = Object.keys(readWrong());
      const g = grammarSet(date, phase, wrong, sharedWeakTopics());
      const w = wordFormSet(date, phase, Math.max(0, daysBetween(DAILY_START, date)), wrong);
      return [...g, ...w];
    });
    return ids;
  }, [day, date, phase, taskId]);

  if (!day) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;
  const amount = dailyAmount(phase);
  const topic = currentTopic(date);
  const open = openTopics(date);
  const best = practiceOf(taskId);

  if (started)
    return (
      <McqRunner
        items={items}
        onFinish={(score, total, passed) => savePractice(taskId, score, total, passed)}
        extra={
          <Button asChild variant="outline">
            <Link to={`/tfng/${date}`}>
              Sang True / False / Not Given <ArrowRight />
            </Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Trắc nghiệm hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Ngữ pháp & word form</h1>
        <p className="max-w-3xl text-muted-foreground">
          {amount.grammar} câu ngữ pháp + {amount.wordForm} câu chọn dạng từ. Khoảng một nửa câu ngữ pháp thuộc chủ điểm mới nhất, phần còn lại ôn các chủ điểm trước (ưu tiên điểm ngữ pháp bạn hay sai, ở cả bài này lẫn bài dịch) và những câu bạn từng sai. Cần đúng ngay lần đầu ≥ 80%; chưa đạt thì chỉ làm lại câu sai.
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 bg-accent/40 p-4" aria-labelledby="topic">
        <p id="topic" className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          <BookOpenCheck className="size-4" aria-hidden /> Chủ điểm mới: {topic.title_vi}
        </p>
        <p className="mt-1 text-sm">{topic.tip_vi}</p>
      </section>

      <section aria-labelledby="open-topics" className="space-y-2">
        <h2 id="open-topics" className="text-sm font-semibold">
          Đã mở {open.length} chủ điểm
        </h2>
        <ol className="flex flex-wrap gap-1.5">
          {open.map((t, i) => (
            <li key={t.id} className="rounded-full border bg-card px-2.5 py-0.5 text-xs">
              {i + 1}. {t.title_vi}
            </li>
          ))}
        </ol>
      </section>

      <WeakPoints />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setStarted(true)} autoFocus data-testid="start-mcq">
          {best ? 'Làm lại' : 'Bắt đầu'} · {items.length} câu
        </Button>
        {best && (
          <span className="text-sm text-muted-foreground tabular-nums">
            Điểm cao nhất: {best.best}/{best.total}
          </span>
        )}
      </div>
    </div>
  );
}
