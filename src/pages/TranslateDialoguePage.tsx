import { ArrowLeft, ArrowRight, MessagesSquare, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { loadRun } from '@/lib/practice/retry';
import { dayByDate, formatDay } from '@/lib/roadmap/plan';
import { LEVEL_DAYS, LEVELS, dayIndexOf, dialogueById, dialogueItems, dialogueSetFor, levelOf, readErrors, recordResults, runKey, weakTags } from '@/lib/translate-daily';

/**
 * /dich-hoi-thoai/:date — 20 lines of everyday dialogue to translate into English: 4 short dialogues of the current
 * level (one of them chosen for the weakest grammar points) and 4 lines that review earlier mistakes.
 */
export default function TranslateDialoguePage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const [started, setStarted] = useState(false);
  const taskId = `${date}:translate-dialogue`;
  const storageKey = runKey(date, 'dialogue');
  const set = useMemo(() => (day ? dialogueSetFor(date) : null), [day, date]);
  const items = useMemo(() => (set ? dialogueItems(set) : []), [set]);
  const [log, setLog] = useState(readErrors);

  if (!day || !set) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;
  const dayIndex = dayIndexOf(date);
  const level = LEVELS[levelOf(dayIndex) - 1]!;
  const nextIn = level.n < LEVELS.length ? LEVEL_DAYS - (dayIndex % LEVEL_DAYS) : 0;
  const weak = weakTags(log);
  const best = practiceOf(taskId);
  const reviewing = set.review.length;

  if (started)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => (setStarted(false), setLog(readErrors()))}>
          <ArrowLeft /> Dịch hội thoại · {formatDay(date)}
        </Button>
        <WriteRunner
          items={items}
          mode="translate"
          heading={`Dịch hội thoại · cấp ${level.n}`}
          storageKey={storageKey}
          onFinish={(score, total, _a, passed) => {
            const run = loadRun(storageKey, items);
            recordResults(
              date,
              items.filter((it) => it.key in run.first).map((it) => ({ key: it.key, ok: Boolean(run.first[it.key]) })),
            );
            savePractice(taskId, score, total, passed);
          }}
          extra={
            <Button asChild variant="outline">
              <Link to={`/dich-truyen/${date}`}>
                Sang dịch truyện ngắn <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Dịch hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Dịch hội thoại đời thường</h1>
        <p className="max-w-3xl text-muted-foreground">
          {items.length} câu ngắn, dịch sang tiếng Anh từng câu. Kiểm tra xong sẽ thấy đáp án mẫu và mẹo ngữ pháp. Viết khác đáp án mà vẫn đúng thì bấm “Tôi viết đúng”. Cần đúng ngay lần đầu ≥ 80%; chưa đạt thì chỉ dịch lại câu sai.
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 bg-accent/40 p-4" aria-labelledby="level">
        <p id="level" className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          <TrendingUp className="size-4" aria-hidden /> Cấp {level.n}/{LEVELS.length} · {level.name}
        </p>
        <p className="mt-1 text-sm">{level.focus}</p>
        {nextIn > 0 && <p className="mt-1 text-xs text-muted-foreground">Lên cấp {level.n + 1} sau {nextIn} ngày nữa — các cấp trước vẫn được ôn xen kẽ.</p>}
      </section>

      <section aria-labelledby="today" className="space-y-2">
        <h2 id="today" className="text-sm font-semibold">
          Hôm nay
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...set.dialogues, ...(set.bonus ? [set.bonus] : [])].map((id, i) => {
            const d = dialogueById(id);
            if (!d) return null;
            return (
              <li key={id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="text-2xl leading-none" aria-hidden>
                  {d.scene}
                </span>
                <span>
                  <span className="font-medium">
                    {i + 1}. {d.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Cấp {d.level}
                    {i === set.dialogues.length - 1 && weak.length > 0 ? ' · chọn theo lỗi bạn hay mắc' : ''}
                    {id === set.bonus ? ` · ${4 - reviewing} câu đầu` : ''}
                  </span>
                </span>
              </li>
            );
          })}
          {reviewing > 0 && (
            <li className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
              <Target className="size-6 text-amber-600" aria-hidden />
              <span>
                <span className="font-medium">{reviewing} câu ôn lỗi</span>
                <span className="block text-xs text-muted-foreground">Câu từng sai và câu luyện đúng điểm ngữ pháp bạn yếu</span>
              </span>
            </li>
          )}
        </ul>
      </section>

      <section aria-labelledby="weak" className="space-y-2">
        <h2 id="weak" className="text-sm font-semibold">
          Lỗi bạn hay mắc
        </h2>
        {weak.length ? (
          <ul className="space-y-1.5">
            {weak.map((t) => (
              <li key={t.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 tabular-nums dark:bg-rose-500/15 dark:text-rose-300">sai {Math.round(t.weight)} lần gần đây</span>
                <p className="mt-0.5 text-muted-foreground">{t.tip}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có. Sau mỗi bài, câu nào sai lần đầu sẽ được ghi lại theo điểm ngữ pháp; bài hôm sau sẽ ưu tiên đúng những điểm đó.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setStarted(true)} autoFocus data-testid="start-translate">
          <MessagesSquare /> {best ? 'Làm lại' : 'Bắt đầu'} · {items.length} câu
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
