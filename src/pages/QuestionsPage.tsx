import { ArrowLeft, HelpCircle, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { readWrong, recordAnswer } from '@/lib/practice-daily';
import { practiceOf, savePractice } from '@/lib/practice/results';
import {
  EXTRA_PER_ROUND,
  LIFE_PER_DAY,
  PER_DAY,
  Q_LEVELS,
  extraRounds,
  extraSetFor,
  qGroupOf,
  qItemsOf,
  qLevelOf,
  questionSetFor,
  type QItem,
} from '@/lib/questions-daily';
import { dayByDate, formatDay, todayKey } from '@/lib/roadmap/plan';
import { recordTagResult } from '@/lib/translate-daily';

/**
 * /dat-cau-hoi/:date — question forming of the day: 13 questions (10 everyday) (ask about the highlighted part, or ask in English
 * about a Vietnamese situation). Passed with ≥ 50 % right on the first try, otherwise only the wrong ones are redone.
 * "Luyện thêm 5 câu" gives 5 more as often as wanted; they don't change the day's result but mistakes come back later.
 */
export default function QuestionsPage() {
  const { date = '' } = useParams();
  const day = dayByDate(date);
  // 0: intro · -1: the day's 5 · n ≥ 1: extra round n
  const [round, setRound] = useState(0);
  const [, setTick] = useState(0);
  const main = useMemo(() => (day ? qItemsOf(questionSetFor(date, Object.keys(readWrong()))) : []), [day, date]);
  const extra = useMemo(() => (day && round > 0 ? qItemsOf(extraSetFor(date, round, Object.keys(readWrong()))) : []), [day, date, round]);
  if (!day) return <p className="text-sm text-muted-foreground">Ngày này không có trong lộ trình.</p>;

  const taskId = `${date}:questions`;
  const best = practiceOf(taskId);
  const level = Q_LEVELS[qLevelOf(date) - 1]!;
  const done = extraRounds(date);
  const groups = [...new Set(main.map((q) => q.group))].map(qGroupOf).filter((g) => g !== undefined);
  const onFirstTry = (item: { key: string }, _t: string, _r: unknown, ok: boolean) => {
    recordAnswer(item.key, ok);
    recordTagResult(todayKey(), `ask:${item.key}`, (item as QItem).tags, ok);
  };
  const more = (label = `Luyện thêm ${EXTRA_PER_ROUND} câu`) => (
    <Button variant="outline" onClick={() => setRound(Math.max(round, done) + 1)} data-testid="more-questions">
      <Plus /> {label}
    </Button>
  );
  const back = (
    <Button variant="ghost" size="sm" onClick={() => setRound(0)}>
      <ArrowLeft /> Đặt câu hỏi · {formatDay(date)}
    </Button>
  );

  if (round === -1)
    return (
      <div className="space-y-4">
        {back}
        <WriteRunner
          items={main}
          mode="translate"
          heading={`Đặt câu hỏi · ${main.length} câu hôm nay`}
          storageKey={`questions:run2:${date}`}
          onFirstTry={onFirstTry}
          onFinish={(score, total, _a, passed) => {
            savePractice(taskId, score, total, passed);
            setTick((t) => t + 1);
          }}
          extra={more()}
        />
      </div>
    );

  if (round > 0)
    return (
      <div className="space-y-4">
        {back}
        <WriteRunner
          key={round}
          items={extra}
          mode="translate"
          heading={`Luyện thêm · lượt ${round} · ${extra.length} câu`}
          storageKey={`questions:run2:${date}:x${round}`}
          onFirstTry={onFirstTry}
          onFinish={() => setTick((t) => t + 1)}
          extra={more(`Luyện thêm ${EXTRA_PER_ROUND} câu nữa`)}
        />
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Bài tập hằng ngày · {formatDay(date)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Đặt câu hỏi</h1>
        <p className="max-w-3xl text-muted-foreground">
          {PER_DAY} câu mỗi ngày: {LIFE_PER_DAY} câu hỏi đời thường (35 tình huống: quán ăn, phòng thi, ngân hàng, phỏng vấn xin việc, tranh luận, xe buýt, sân
          bay, siêu thị, gọi điện, làm việc nhóm…) và {PER_DAY - LIFE_PER_DAY} câu theo chủ điểm ngữ pháp — đặt câu hỏi cho phần được tô màu, hoặc hỏi bằng
          tiếng Anh theo tình huống tiếng Việt. Câu nhờ / xin phép chấp nhận cả Could / Can / May và có hay không có “please”. Không tính dấu chấm hỏi, chữ hoa
          và viết tắt. Cần đúng ngay lần đầu ≥ 50%; chưa đạt thì chỉ làm lại câu sai. Muốn luyện nhiều hơn thì bấm “Luyện thêm” — bao nhiêu lượt cũng được, câu
          sai sẽ quay lại vào các ngày sau.
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 bg-accent/40 p-4" aria-labelledby="qlv">
        <p id="qlv" className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          <HelpCircle className="size-4" aria-hidden /> Cấp {level.n}/{Q_LEVELS.length} · {level.name}
        </p>
        <p className="mt-1 text-sm" lang="en">
          {level.focus}
        </p>
      </section>

      <section aria-labelledby="qgroups" className="space-y-2">
        <h2 id="qgroups" className="text-sm font-semibold">
          Cách đặt câu hỏi hôm nay
        </h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="font-medium">{g.name}</span>
              <p className="mt-0.5 text-muted-foreground">{g.tip}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Mẹo chung: tìm động từ trong câu trả lời → chọn trợ động từ (am / is / are · do / does / did · have / has · will / can…) → từ để hỏi + trợ động từ +
          chủ ngữ + động từ. Nếu hỏi chính <b>chủ ngữ</b> (Who / What làm việc đó?) thì không cần trợ động từ.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => setRound(-1)} autoFocus data-testid="start-questions">
          <HelpCircle /> {best ? 'Làm tiếp / làm lại' : 'Bắt đầu'} · {main.length} câu
        </Button>
        {more(done ? `Luyện thêm ${EXTRA_PER_ROUND} câu (đã luyện thêm ${done} lượt)` : undefined)}
        {best && (
          <span className="text-sm text-muted-foreground tabular-nums">
            Đúng ngay lần đầu: {best.best}/{best.total}
            {best.passed ? ' · đã đạt' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
