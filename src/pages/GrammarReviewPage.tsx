import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Repeat } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { McqRunner } from '@/features/daily/McqRunner';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { REVIEW_AT, lessonOf, linesOf, reviewFor, reviewLines, reviewMcq, topicsOf } from '@/lib/grammar-review';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { formatDay, todayKey } from '@/lib/roadmap/plan';
import { TAGS, firstTryTags, readErrors, recordResults } from '@/lib/translate-daily';

/**
 * /on-ngu-phap/:tag — review of one grammar point: the rule in brief, examples from the translations, then 8 questions.
 * /on-tap-loi/:date — the day's review: the point with the most mistakes (≥ 3), or nothing to review today.
 */
export default function GrammarReviewPage() {
  const { tag: asked, date } = useParams();
  const tag = useMemo(() => (date ? reviewFor(date) : (asked ?? null)), [asked, date]);

  if (date && !tag)
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Ôn lại ngữ pháp · {formatDay(date)}</p>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" aria-hidden />
          <div>
            <p className="font-semibold">Hôm nay không cần ôn</p>
            <p className="text-sm text-muted-foreground">Chưa có điểm ngữ pháp nào sai từ {REVIEW_AT} lần trở lên. Việc này đã được đánh dấu xong.</p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/today">
            <ArrowLeft /> Về Hôm nay
          </Link>
        </Button>
      </div>
    );
  if (!tag || !TAGS[tag]) return <p className="text-sm text-muted-foreground">Không tìm thấy điểm ngữ pháp này.</p>;
  return <Review key={tag} tag={tag} date={date} />;
}

function Review({ tag, date }: { tag: string; date?: string }) {
  const info = TAGS[tag]!;
  const [started, setStarted] = useState(false);
  const [, setTick] = useState(0);
  const log = readErrors();
  const weight = log.tags[tag] ?? 0;
  const topics = topicsOf(tag);
  const examples = useMemo(() => linesOf(tag, log).slice(0, 4), [tag, log]);
  const seed = `${tag}:${date ?? todayKey()}`;
  const mcq = useMemo(() => reviewMcq(tag, seed), [tag, seed]);
  const lines = useMemo(() => (mcq.length ? [] : reviewLines(tag)), [mcq, tag]);
  const taskId = date ? `${date}:grammar-weak` : `review:${tag}`;
  const best = practiceOf(taskId);
  const lesson = lessonOf(tag);
  const total = mcq.length || lines.length;
  const finish = (score: number, n: number, passed: boolean) => {
    savePractice(taskId, score, n, passed);
    setTick((t) => t + 1);
  };
  const back = (
    <Button asChild variant="outline">
      <Link to={date ? '/dashboard' : '/dich-hoi-thoai/' + todayKey()}>
        Về {date ? 'Hôm nay' : 'bài dịch'} <ArrowRight />
      </Link>
    </Button>
  );

  if (started)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStarted(false)}>
          <ArrowLeft /> Ôn lại · {info.name}
        </Button>
        {mcq.length ? (
          <McqRunner items={mcq} onFinish={finish} extra={back} />
        ) : (
          <WriteRunner
            items={lines}
            mode="translate"
            heading={`Ôn lại · ${info.name}`}
            storageKey={`grammar-review:run:${taskId}`}
            onFirstTry={(item, _t, result, ok) => recordResults(date ?? todayKey(), [{ key: item.key, ok, tags: ok ? undefined : firstTryTags(item, result) }])}
            onFinish={(s, n, _a, passed) => finish(s, n, passed)}
            extra={back}
          />
        )}
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Ôn lại ngữ pháp{date ? ` · ${formatDay(date)}` : ''}</p>
        <h1 className="text-2xl font-bold tracking-tight">{info.name}</h1>
        {weight >= 1 && (
          <p className="text-sm">
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 tabular-nums dark:bg-rose-500/15 dark:text-rose-300">sai {Math.round(weight)} lần gần đây</span>{' '}
            <span className="text-muted-foreground">ở bài dịch và trắc nghiệm. Làm đúng các câu dưới đây thì số này giảm dần.</span>
          </p>
        )}
      </header>

      <section aria-labelledby="rule" className="rounded-xl border border-primary/30 bg-accent/40 p-4">
        <h2 id="rule" className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          <BookOpen className="size-4" aria-hidden /> Nhớ nhanh
        </h2>
        <p className="mt-1 text-sm">{info.tip}</p>
        {topics.map((t) => (
          <p key={t.id} className="mt-1.5 text-sm">
            <b>{t.title_vi}:</b> {t.tip_vi}
          </p>
        ))}
        {lesson && (
          <Link to={`/grammar/${lesson}`} className="mt-2 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline">
            Xem bài học đầy đủ (lý thuyết, sơ đồ, ví dụ) →
          </Link>
        )}
      </section>

      {examples.length > 0 && (
        <section aria-labelledby="ex" className="space-y-2">
          <h2 id="ex" className="text-sm font-semibold">
            Ví dụ từ các bài dịch
          </h2>
          <ul className="space-y-1.5">
            {examples.map((x) => (
              <li key={x.key} className="rounded-lg border bg-card px-3 py-2 text-sm">
                <span lang="en" className="font-medium">
                  {x.line.en[0]}
                </span>
                <span className="block text-muted-foreground">{x.line.vi}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setStarted(true)} autoFocus data-testid="start-review">
          <Repeat /> {best ? 'Làm lại' : 'Bắt đầu ôn'} · {total} câu {mcq.length ? 'trắc nghiệm' : 'dịch'}
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
