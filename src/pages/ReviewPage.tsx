import { ArrowRight, Bell, CalendarClock, CheckCircle2, Layers, ListChecks, Plus, Shapes, Sparkles, SpellCheck2, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudyLanguage } from '@/features/study/context';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/features/profile/api';
import { DEFAULT_SETTINGS } from '@/features/profile/schemas';
import { useNewReviewedToday } from '@/features/review/api';
import { DAILY_NEW_GOAL, newLimitFor, useAddStarterWords, useDailyGoal } from '@/features/review/goal';
import { PracticeSession } from '@/features/review/PracticeSession';
import { buildReviewQueue, forecast } from '@/features/review/queue';
import { ReviewSession, type Direction } from '@/features/review/ReviewSession';
import { useVocabulary, type VocabWord } from '@/features/vocabulary/api';
import { toUserMessage } from '@/lib/errors';
import type { SrsMode } from '@/lib/srs/sm2';
import { cn } from '@/lib/utils';

type Kind = 'practice' | 'flash';

export default function ReviewPage() {
  const vocab = useVocabulary();
  const newToday = useNewReviewedToday();
  const goal = useDailyGoal();
  const starter = useAddStarterWords();
  const settings = useProfile().data?.settings ?? DEFAULT_SETTINGS;
  const { lang: study } = useStudyLanguage();
  const [direction, setDirection] = useState<Direction>('forward');
  const [session, setSession] = useState<{ kind: Kind; queue: VocabWord[] } | null>(null);

  if (vocab.isError || newToday.isError) return <ErrorState error={vocab.error ?? newToday.error} onRetry={() => (vocab.refetch(), newToday.refetch())} />;
  if (!vocab.data || !newToday.data) return <Skeleton className="h-96" />;

  const words = vocab.data;
  const mode: SrsMode = settings.srsMode === 'fixed' ? { mode: 'fixed', intervals: settings.fixedIntervals } : { mode: 'sm2' };
  const newLimit = newLimitFor(settings.newPerDay);
  const deck = (language: 'en' | 'zh') =>
    buildReviewQueue(words, { language, newLimit, newDoneToday: words.filter((w) => w.language === language && newToday.data.has(w.id)).length });
  const en = deck('en');
  const zh = deck('zh');
  const language = study;
  const current = language === 'en' ? en : zh;

  if (session?.kind === 'practice') return <PracticeSession language={language} queue={session.queue} all={words} mode={mode} onDone={() => setSession(null)} />;
  if (session?.kind === 'flash') return <ReviewSession language={language} queue={session.queue} mode={mode} direction={direction} onDone={() => setSession(null)} />;

  const days = forecast(words, language);
  const max = Math.max(1, ...days.map((d) => d.count));
  const left = goal ? Math.max(0, goal.goal - goal.learned) : 0;
  const short = goal && !goal.done && goal.available < left;

  const addStarter = async (n: number) => {
    try {
      const r = await starter.add(n);
      toast.success(r.inserted ? `Đã thêm ${r.inserted} từ IELTS vào sổ — bắt đầu học nhé!` : 'Bạn đã có hết các từ gợi ý trong sổ.');
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ôn tập từ vựng {language === 'zh' ? 'tiếng Trung' : 'tiếng Anh'}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Lặp lại ngắt quãng (spaced repetition): từ quay lại đúng lúc bạn sắp quên. Mỗi từ được ôn bằng cách <b>dùng</b> nó — chọn nghĩa, điền dạng từ, rồi dịch lại.
          </p>
        </div>
      </div>

      {/* Daily goal */}
      {goal && (
        <Card className={cn('mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center', goal.done ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5' : 'border-violet-200 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/5')} data-testid="daily-goal">
          <Ring value={goal.learned} max={goal.goal} done={goal.done} />
          <div className="flex-1 space-y-1">
            <p className="text-lg font-semibold">{goal.done ? 'Xong mục tiêu hôm nay! 🎉' : `Mục tiêu: học ${DAILY_NEW_GOAL} từ mới mỗi ngày`}</p>
            <p className="text-sm text-muted-foreground">
              {goal.done
                ? `Bạn đã học ${goal.learned} từ mới hôm nay. Ôn thêm các từ đến hạn để nhớ lâu hơn.`
                : `Hôm nay bạn đã học ${goal.learned} từ — còn ${left} từ nữa. Chưa xong, LinguaFlow sẽ nhắc trên màn hình.`}
            </p>
            {short && (
              <p className="text-sm">
                Sổ từ chỉ còn {goal.available} từ mới.{' '}
                {language === 'en' && (
                  <>
                    <button type="button" className="font-medium text-violet-700 hover:underline disabled:opacity-50 dark:text-violet-300" disabled={!starter.ready || starter.pending} onClick={() => addStarter(DAILY_NEW_GOAL)}>
                      <Plus className="inline size-3.5" /> Thêm {DAILY_NEW_GOAL} từ IELTS gợi ý
                    </button>{' '}
                    hoặc{' '}
                  </>
                )}
                <Link to="/lessons" className="text-violet-700 hover:underline dark:text-violet-300">
                  lưu từ trong bài nghe
                </Link>
                .
              </p>
            )}
            {!goal.done && typeof Notification !== 'undefined' && Notification.permission === 'default' && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Bell className="size-3.5" aria-hidden /> Bấm “Nhắc tôi” ở thanh tím phía trên để nhận thông báo lúc 12h và 20h nếu chưa học xong.
              </p>
            )}
          </div>
        </Card>
      )}

      {current.counts.total === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sổ từ còn trống"
          description="Mỗi từ bạn lưu sẽ thành một thẻ ôn tập."
          action={
            language === 'en' ? (
              <Button size="sm" onClick={() => addStarter(DAILY_NEW_GOAL)} disabled={!starter.ready || starter.pending}>
                <Plus /> Thêm {DAILY_NEW_GOAL} từ IELTS gợi ý
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/lessons">Tìm từ trong bài học</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Đến hạn ôn" value={current.counts.due} testid="due-now" />
            <Stat label="Từ mới còn hôm nay" value={current.counts.newLeftToday} sub={`${current.counts.newAvailable} từ mới trong sổ`} testid="new-today" />
            <Stat label="Tổng số thẻ" value={current.counts.total} />
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-4" /> 7 ngày tới
              </p>
              <div className="mt-2 flex h-12 items-end gap-1" aria-label="Số thẻ đến hạn mỗi ngày" data-testid="forecast">
                {days.map((d) => (
                  <div key={d.date.toISOString()} className="flex flex-1 flex-col items-center gap-0.5" title={`${d.date.toLocaleDateString()}: ${d.count}`}>
                    <div className="w-full rounded-sm bg-violet-500/70" style={{ height: `${Math.max(2, (d.count / max) * 40)}px` }} />
                    <span className="text-[10px] text-muted-foreground">{d.date.toLocaleDateString('vi-VN', { weekday: 'narrow' })}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {current.queue.length === 0 ? (
            <Card className="flex items-center gap-3 p-5 text-sm">
              <Sparkles className="size-5 text-success" aria-hidden /> Đã ôn hết thẻ đến hạn — quay lại sau nhé.
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card className="space-y-4 border-violet-200 p-5 dark:border-violet-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Khuyên dùng</p>
                    <h2 className="text-lg font-semibold">Ôn bằng cách dùng từ</h2>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-sm font-semibold text-violet-800 tabular-nums dark:bg-violet-500/20 dark:text-violet-200">{current.queue.length} từ</span>
                </div>
                <ol className="grid gap-2 sm:grid-cols-3">
                  {[
                    { icon: ListChecks, t: 'Chọn nghĩa', d: 'Nhìn từ, chọn nghĩa tiếng Việt đúng' },
                    { icon: Shapes, t: 'Điền dạng từ', d: 'Điền đúng dạng trong họ từ vào câu' },
                    { icon: SpellCheck2, t: 'Dịch sang từ', d: 'Nhìn nghĩa, tự gõ lại từ' },
                  ].map((s, i) => (
                    <li key={s.t} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="flex size-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">{i + 1}</span>
                        <s.icon className="size-4 text-violet-600" aria-hidden /> {s.t}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">Làm theo nhóm 10 từ. Sai bao nhiêu bước quyết định khi nào từ quay lại — bạn không cần tự chấm.</p>
                <Button size="lg" className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={() => setSession({ kind: 'practice', queue: current.queue })} data-start="practice">
                  Bắt đầu ôn {current.queue.length} từ <ArrowRight />
                </Button>
              </Card>

              <Card className="flex flex-col justify-between gap-4 p-5">
                <div>
                  <h2 className="flex items-center gap-1.5 font-semibold">
                    <Zap className="size-4 text-amber-500" aria-hidden /> Lật thẻ nhanh
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Khi ít thời gian: xem thẻ, tự chấm Again / Hard / Good / Easy.</p>
                </div>
                <NativeSelect value={direction} onChange={(e) => setDirection(e.target.value as Direction)} aria-label="Mặt trước thẻ">
                  <option value="forward">Từ → nghĩa</option>
                  <option value="reverse">Nghĩa → từ</option>
                </NativeSelect>
                <Button variant="outline" onClick={() => setSession({ kind: 'flash', queue: current.queue })} data-start="flash">
                  Lật {current.queue.length} thẻ
                </Button>
                <p className="text-xs text-muted-foreground">Phím: Space lật · 1–4 chấm</p>
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, sub, testid }: { label: string; value: number; sub?: string; testid?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tabular-nums" data-testid={testid}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function Ring({ value, max, done }: { value: number; max: number; done: boolean }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div className="relative size-20 shrink-0" aria-label={`${value} trên ${max} từ mới hôm nay`} role="img">
      <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className={done ? 'stroke-emerald-500' : 'stroke-violet-600'} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">
        {done ? <CheckCircle2 className="size-7 text-emerald-600" aria-hidden /> : `${value}/${max}`}
      </span>
    </div>
  );
}
