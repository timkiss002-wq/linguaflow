import { ArrowLeft, ArrowRight, Link2, PenLine } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { McqRunner } from '@/features/daily/McqRunner';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { LINK_GROUPS, LINK_LEVELS, linkLevelOf, linkingSetFor, mcqOf, readStep, saveStep, writeOf } from '@/lib/linking-daily';
import { readWrong, recordAnswer } from '@/lib/practice-daily';
import { practiceOf, savePractice } from '@/lib/practice/results';
import { dayByDate, formatDay } from '@/lib/roadmap/plan';

/**
 * /tu-noi/:date — linking words of the day: step 1, six gaps to fill (multiple choice); step 2, join two sentences
 * with the given linking word and correct sentences that use one wrongly. Passed when both steps are.
 */
export default function LinkingPage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  const [step, setStep] = useState<'intro' | 'mcq' | 'write'>('intro');
  const [, setTick] = useState(0);
  const set = useMemo(() => (day ? linkingSetFor(date, Object.keys(readWrong())) : null), [day, date]);
  const mcq = useMemo(() => (set ? mcqOf(set) : []), [set]);
  const write = useMemo(() => (set ? writeOf(set) : []), [set]);
  if (!day || !set) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;

  const taskId = `${date}:linking`;
  const level = LINK_LEVELS[linkLevelOf(date) - 1]!;
  const groups = LINK_GROUPS.filter((g) => [...mcq.map((m) => m.id), ...write.map((w) => w.key)].some((id) => id.startsWith(`l:${g.id}:`)));
  const step1 = readStep(date);
  const best = practiceOf(taskId);

  if (step === 'mcq')
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('intro')}>
          <ArrowLeft /> Từ nối · {formatDay(date)}
        </Button>
        <p className="text-sm font-medium">Bước 1/2 · Chọn từ nối đúng</p>
        <McqRunner
          items={mcq}
          onFinish={(score, total, passed) => {
            saveStep(date, { score, total, passed });
            setTick((t) => t + 1);
          }}
          extra={
            <Button onClick={() => setStep('write')}>
              Sang bước 2: nối & sửa câu <ArrowRight />
            </Button>
          }
        />
      </div>
    );

  if (step === 'write')
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('intro')}>
          <ArrowLeft /> Từ nối · {formatDay(date)}
        </Button>
        <WriteRunner
          items={write}
          mode="fix"
          heading="Bước 2/2 · Nối câu & sửa lỗi"
          storageKey={`linking:run:${date}`}
          onFirstTry={(item, _t, _r, ok) => recordAnswer(item.key, ok)}
          onFinish={(score, total, _a, passed) => {
            const m = readStep(date) ?? { score: 0, total: mcq.length, passed: false };
            savePractice(taskId, m.score + score, m.total + total, m.passed && passed);
            setTick((t) => t + 1);
          }}
          extra={
            !readStep(date)?.passed ? (
              <Button variant="outline" onClick={() => setStep('mcq')}>
                Làm lại bước 1 (chưa đạt)
              </Button>
            ) : undefined
          }
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Bài tập hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Từ nối</h1>
        <p className="max-w-3xl text-muted-foreground">
          Bước 1: {mcq.length} câu chọn từ nối. Bước 2: {write.length} câu viết — nối hai câu bằng từ cho sẵn và sửa câu dùng sai. Câu sai sẽ quay lại vào các ngày sau và được tính vào điểm “Liên từ” trong lỗi hay mắc. Mỗi bước cần đúng ngay lần đầu ≥ 80%.
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 bg-accent/40 p-4" aria-labelledby="lv">
        <p id="lv" className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          <Link2 className="size-4" aria-hidden /> Cấp {level.n}/{LINK_LEVELS.length} · {level.name}
        </p>
        <p className="mt-1 text-sm">{level.focus}</p>
      </section>

      <section aria-labelledby="groups" className="space-y-2">
        <h2 id="groups" className="text-sm font-semibold">
          Nhóm từ nối hôm nay
        </h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="font-medium">{g.name}</span>
              <p className="mt-0.5 text-muted-foreground">{g.tip}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setStep('mcq')} autoFocus data-testid="start-linking">
          <Link2 /> {step1 ? 'Làm lại bước 1' : 'Bắt đầu'} · {mcq.length} câu chọn
        </Button>
        {step1 && (
          <Button size="lg" variant={best?.passed ? 'outline' : 'default'} onClick={() => setStep('write')}>
            <PenLine /> Bước 2 · {write.length} câu viết
          </Button>
        )}
        {best && (
          <span className="text-sm text-muted-foreground tabular-nums">
            Đúng ngay lần đầu: {best.best}/{best.total}
          </span>
        )}
      </div>
    </div>
  );
}
