import { ArrowLeft, CheckCircle2, Circle, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { useRoadmapContext } from '@/features/roadmap/useRoadmap';
import { phraseItems } from '@/lib/practice/items';
import { PRACTICE_PASS } from '@/lib/practice/results';
import { activeTopicOf, activeWordsOf, dayByDate, formatDay } from '@/lib/roadmap/plan';
import { dayLock, refreshRoadmap } from '@/lib/roadmap/progress';
import { saveSentences, sentencesOf } from '@/lib/roadmap/sentences';

/**
 * /viet-cau/:date — the active-vocabulary task of one day: learn 5 Writing collocations, then translate 3 simple
 * Vietnamese sentences per collocation into English with it. Checked on the device against model answers, with hints;
 * done at 50 % right on the first try. Saved in this browser.
 */
export default function SentencesPage() {
  const { date = '' } = useParams();
  const ctx = useRoadmapContext();
  const day = dayByDate(date);
  const task = day?.tasks.find((t) => t.kind === 'vocab-active');
  const topic = task ? activeTopicOf(task) : undefined;
  const words = useMemo(() => (task ? activeWordsOf(task) : []), [task]);
  const items = useMemo(() => (topic ? phraseItems(topic.id, words) : []), [topic, words]);
  const [saved, setSaved] = useState(() => sentencesOf(date));
  const [showEx, setShowEx] = useState(true);
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);

  if (!day || !task || !topic)
    return (
      <EmptyState
        icon={Circle}
        title="Ngày này không có bài cụm từ"
        description="Bài cụm từ chủ động có vào thứ Hai – thứ Bảy của giai đoạn Nền tảng và Luyện tập."
        action={
          <Button asChild variant="outline">
            <Link to="/lo-trinh">Xem lộ trình</Link>
          </Button>
        }
      />
    );

  const lock = dayLock(day, ctx);
  const store = (score: number, total: number, _answers?: unknown, ok?: boolean) => {
    const passed = ok ?? (total === 0 || score / total >= PRACTICE_PASS);
    // keep the best result: a worse retry doesn't undo a finished day
    const prev = sentencesOf(date);
    if (prev?.passed && !passed) return;
    if (prev?.passed && passed && (prev.score ?? 0) >= score) return;
    const entry = { text: '', manual: [], savedAt: new Date().toISOString(), passed, score, total };
    saveSentences(date, entry);
    setSaved(entry);
    refreshRoadmap();
    if (!total) toast.success('Đã đánh dấu học xong 5 cụm hôm nay.');
    else if (passed) toast.success('Đạt — đã xong bài hôm nay.');
    else toast(`${score}/${total} câu đúng ngay lần đầu, chưa đủ 50%. Chỉ cần làm lại những câu sai.`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to={`/lo-trinh/${date}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden /> {formatDay(date)}
      </Link>
      <header>
        <p className="text-sm font-medium text-muted-foreground">Từ vựng chủ động · {topic.vi}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Học 5 cụm, dịch câu với từng cụm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mỗi cụm có 3 câu tiếng Việt đơn giản. Dịch sang tiếng Anh và <b>phải dùng đúng cụm đó</b> (được chia thì, thêm -s…). Máy chấm ngay; câu của bạn khác đáp án
          nhưng vẫn đúng thì bấm “Tôi viết đúng”.
        </p>
      </header>

      {lock && (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="size-4" aria-hidden /> {lock}
        </p>
      )}

      {saved && (
        <p className={saved.passed ? 'flex items-center gap-1.5 text-sm font-medium text-success' : 'text-sm text-muted-foreground'} data-testid="phrase-result">
          {saved.passed && <CheckCircle2 className="size-4" aria-hidden />}
          {saved.total ? `Lần tốt nhất: ${saved.score}/${saved.total} câu đúng ngay lần đầu` : 'Đã học xong'}
          {saved.passed ? ' · đã xong bài hôm nay' : ' · chưa đạt 50% — làm lại các câu sai là xong'}
        </p>
      )}

      <section className="rounded-xl border bg-card p-4" aria-labelledby="phrases">
        <div className="flex items-center justify-between gap-2">
          <h2 id="phrases" className="text-sm font-semibold">
            1 · 5 cụm từ hôm nay
          </h2>
          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowEx((v) => !v)}>
            {showEx ? 'Ẩn ví dụ (tự nhớ lại)' : 'Hiện ví dụ'}
          </button>
        </div>
        <ul className="mt-2 divide-y">
          {words.map((w) => (
            <li key={w.t} className="py-2">
              <p>
                <span className="font-semibold" lang="en">
                  {w.t}
                </span>
                {w.p && <PosBadge pos={w.p} className="ml-1.5" />}
                <span className="text-muted-foreground"> — {w.m}</span>
              </p>
              {showEx && (
                <p className="text-sm italic text-muted-foreground" lang="en">
                  {w.ex}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="translate">
        <h2 id="translate" className="text-sm font-semibold">
          2 · Dịch câu Việt → Anh {items.length > 0 && <span className="font-normal text-muted-foreground">({items.length} câu)</span>}
        </h2>
        {lock ? null : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Chủ đề này chưa có câu mẫu để dịch. Học thuộc 5 cụm ở trên rồi bấm nút dưới đây.</p>
            {!saved?.passed && (
              <Button className="mt-3" onClick={() => store(0, 0)}>
                Đã học xong 5 cụm
              </Button>
            )}
          </div>
        ) : started ? (
          <WriteRunner key={`${date}:${run}`} items={items} mode="translate" heading="Dịch câu với cụm từ" onFinish={store} storageKey={`${date}:vocab-active`} />
        ) : (
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="text-muted-foreground">
              Ẩn ví dụ ở trên trước khi làm để tự nhớ lại cụm. Gõ câu rồi bấm Enter để kiểm tra; bí thì bấm “Xem gợi ý”. Cần đúng ngay lần đầu{' '}
              {Math.ceil(items.length * PRACTICE_PASS)}/{items.length} câu; chưa đạt thì chỉ làm lại những câu sai.
            </p>
            <Button
              className="mt-3"
              onClick={() => {
                setShowEx(false);
                setStarted(true);
                setRun((n) => n + 1);
              }}
            >
              {saved?.passed ? 'Xem / luyện lại' : saved ? 'Làm tiếp' : 'Bắt đầu dịch'}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
