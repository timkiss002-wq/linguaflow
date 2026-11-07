import { BookOpen, Clock, Filter, Headphones, History as HistoryIcon, Play, RotateCcw, Target } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useIeltsAttempts, type IeltsAttempt } from '@/features/ielts/api';
import { TESTS, TYPE_LABEL, fmtBand, partQuestions, statsByType, testById, type PracticeTest, type QuestionType, type Skill, type TestPart } from '@/lib/ielts/tests';
import { FilterBox, FilterPanel, Radio } from '@/features/ielts/LibraryFilters';
import { useIeltsTarget } from '@/features/learner/useIeltsTarget';
import { cn } from '@/lib/utils';

/**
 * Practice library for one skill, laid out like a test bank:
 * filters on the left (format, status, question type), cards on the right, results underneath.
 * Filters live in the URL (?format=full&status=todo&type=tfng,gap) so a filtered list can be bookmarked.
 */

type Format = 'part' | 'full';
type Status = 'all' | 'todo' | 'done';

const SKILL = {
  reading: { label: 'Reading', unit: 'Passage', icon: BookOpen, intro: 'Đề soạn riêng theo đúng format IELTS Academic. Chấm tự động, giải thích từng câu bằng tiếng Việt và chỉ ra chỗ chứa đáp án trong bài.' },
  listening: { label: 'Listening', unit: 'Part', icon: Headphones, intro: 'Bài nghe theo format IELTS: 4 phần, 40 câu. Luyện tập thì nghe lại thoải mái; thi thử thì mỗi phần chỉ nghe một lần.' },
} as const;

/** Card header colours per part number, so Passage 1/2/3 are told apart at a glance. */
const PART_COLOR = ['bg-orange-700', 'bg-violet-700', 'bg-sky-700', 'bg-emerald-700']; // 700: white text passes WCAG AA
const COVER = {
  reading: 'from-amber-100 via-orange-50 to-rose-100 dark:from-amber-500/15 dark:via-orange-500/5 dark:to-rose-500/15',
  listening: 'from-teal-100 via-cyan-50 to-sky-100 dark:from-teal-500/15 dark:via-cyan-500/5 dark:to-sky-500/15',
};

const typesOf = (p: TestPart) => [...new Set(partQuestions(p).map(({ group }) => group.type as QuestionType))];

interface PartStat {
  tries: number;
  correct: number;
  total: number;
}

export default function IeltsTestsPage({ skill }: { skill: Skill }) {
  const attempts = useIeltsAttempts();
  const [params, setParams] = useSearchParams();
  const format: Format = params.get('format') === 'full' ? 'full' : 'part';
  const status: Status = params.get('status') === 'todo' ? 'todo' : params.get('status') === 'done' ? 'done' : 'all';
  const picked = (params.get('type') ?? '').split(',').filter(Boolean) as QuestionType[];
  const set = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v) n.set(k, v);
        else n.delete(k);
        return n;
      },
      { replace: true },
    );

  const tests = TESTS.filter((t) => t.skill === skill);
  const mine = useMemo(() => (attempts.data ?? []).filter((a) => a.skill === skill), [attempts.data, skill]);

  /** per part: how many attempts included it, and the latest score on it */
  const partStats = useMemo(() => {
    const out = new Map<string, PartStat>();
    for (const a of [...mine].reverse()) {
      for (const pid of a.parts) {
        const rs = a.results.filter((r) => r.part === pid);
        out.set(pid, { tries: (out.get(pid)?.tries ?? 0) + 1, correct: rs.filter((r) => r.mark === 'correct').length, total: rs.length });
      }
    }
    return out;
  }, [mine]);

  const allTypes = [...new Set(tests.flatMap((t) => t.parts.flatMap(typesOf)))];
  const keepType = (types: QuestionType[]) => !picked.length || types.some((t) => picked.includes(t));
  const keepStatus = (done: boolean) => status === 'all' || (status === 'done') === done;

  const partCards = tests.flatMap((t) => t.parts.map((p, i) => ({ t, p, i }))).filter(({ p }) => keepType(typesOf(p)) && keepStatus(partStats.has(p.id)));
  const fullCards = tests.filter((t) => keepType(t.parts.flatMap(typesOf)) && keepStatus(mine.some((a) => a.test_id === t.id && a.parts.length === t.parts.length)));
  const count = format === 'full' ? fullCards.length : partCards.length;
  const filtered = status !== 'all' || picked.length > 0;
  const S = SKILL[skill];
  const active = (format === 'full' ? 1 : 0) + (status !== 'all' ? 1 : 0) + picked.length;

  const filterBody = (
    <>
          <FilterBox title={`${S.label}`} icon={<S.icon className="size-4" aria-hidden />} highlight>
        <Radio name="format" checked={format === 'part'} onChange={() => set('format', null)} label="Bài lẻ" hint={`Từng ${S.unit.toLowerCase()}`} />
        <Radio name="format" checked={format === 'full'} onChange={() => set('format', 'full')} label="Full đề" hint="40 câu, có band" />
      </FilterBox>
      <FilterBox title="Trạng thái">
        <Radio name="status" checked={status === 'all'} onChange={() => set('status', null)} label="Tất cả" />
        <Radio name="status" checked={status === 'todo'} onChange={() => set('status', 'todo')} label="Chưa làm" />
        <Radio name="status" checked={status === 'done'} onChange={() => set('status', 'done')} label="Đã làm" />
      </FilterBox>
      <FilterBox title="Dạng câu hỏi">
        {allTypes.map((ty) => (
          <label key={ty} className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-amber-600"
              checked={picked.includes(ty)}
              onChange={(e) => set('type', (e.target.checked ? [...picked, ty] : picked.filter((x) => x !== ty)).join(',') || null)}
            />
            <span>{TYPE_LABEL[ty].en}</span>
          </label>
        ))}
      </FilterBox>
      {filtered && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setParams(format === 'full' ? { format: 'full' } : {}, { replace: true })}>
          <RotateCcw /> Xoá bộ lọc
        </Button>
      )}
    </>
  );

  return (
    <>
      <GoalBanner skill={skill} attempts={mine} />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <FilterPanel active={active}>{filterBody}</FilterPanel>

        {/* Library */}
        <section aria-label={`Đề ${S.label}`} className="min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Luyện đề IELTS {S.label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{count} {format === 'full' ? 'đề' : 'bài'}</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">{S.intro}</p>
          </div>

          {count === 0 ? (
            <EmptyState icon={Filter} title="Không có bài nào khớp bộ lọc" description="Bỏ bớt dạng câu hỏi hoặc đổi trạng thái để xem thêm." />
          ) : format === 'part' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {partCards.map(({ t, p, i }) => (
                <PartCard key={p.id} test={t} part={p} index={i} unit={S.unit} stat={partStats.get(p.id)} loading={attempts.isPending} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {fullCards.map((t) => (
                <FullCard key={t.id} test={t} attempts={mine.filter((a) => a.test_id === t.id)} loading={attempts.isPending} />
              ))}
            </div>
          )}

          {attempts.isError && (
            <div className="mt-6">
              <ErrorState error={attempts.error} onRetry={() => attempts.refetch()} />
            </div>
          )}
          {mine.length > 0 && (
            <div className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold">Kết quả của bạn</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <WeakTypes attempts={mine} />
                <History attempts={mine} />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/** Top banner: the goal, plus the single most useful next step (the weakest question type). */
function GoalBanner({ skill, attempts }: { skill: Skill; attempts: IeltsAttempt[] }) {
  const goal = useIeltsTarget();
  const weakest = statsByType(attempts.flatMap((a) => a.results))[0];
  const bands = attempts.filter((a) => a.band !== null).map((a) => Number(a.band));
  const best = bands.length ? Math.max(...bands) : null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-amber-500/30 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-rose-500/10">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-700 text-white">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="text-sm">
          <p className="font-semibold">
            Mục tiêu band {fmtBand(goal.band)} · {skill === 'reading' ? 'Reading' : 'Listening'}
            {best !== null && <span className="ml-2 font-normal text-muted-foreground">Band tốt nhất: {fmtBand(best)}</span>}
          </p>
          <p className="text-muted-foreground">
            {weakest
              ? `Dạng yếu nhất hiện tại: ${TYPE_LABEL[weakest.type].en} (${Math.round((weakest.correct / weakest.answered) * 100)}% đúng). Lọc dạng này bên trái để luyện riêng.`
              : 'Bắt đầu bằng một bài lẻ để biết dạng câu hỏi nào bạn còn yếu.'}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" className="shrink-0 bg-background">
        <Link to="/insights">Xem điểm mạnh & yếu</Link>
      </Button>
    </div>
  );
}

function Cover({ skill, children }: { skill: Skill; children: ReactNode }) {
  const Icon = skill === 'reading' ? BookOpen : Headphones;
  return (
    <div className={cn('relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br', COVER[skill])}>
      <Icon className="size-14 text-foreground/10" aria-hidden />
      {children}
    </div>
  );
}

function PartCard({ test, part, index, unit, stat, loading }: { test: PracticeTest; part: TestPart; index: number; unit: string; stat?: PartStat; loading: boolean }) {
  const n = partQuestions(part).length;
  const pct = stat && stat.total ? Math.round((stat.correct / stat.total) * 100) : null;
  return (
    <Link
      to={`/ielts/${test.id}?parts=${part.id}&mode=practice`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-part={part.id}
    >
      <Cover skill={test.skill}>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          <HistoryIcon className="size-3" aria-hidden /> {loading ? '…' : stat ? `Bạn đã làm ${stat.tries} lần` : 'Bạn chưa làm'}
        </span>
        <span className={cn('absolute bottom-0 left-0 rounded-tr-lg px-2.5 py-1 text-xs font-semibold text-white', PART_COLOR[index % PART_COLOR.length])}>
          {unit} {index + 1}
        </span>
        {pct !== null && (
          <span className={cn('absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold', pct >= 70 ? 'bg-emerald-700 text-white' : 'bg-white/90 text-slate-900')}>{pct}% đúng</span>
        )}
      </Cover>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-semibold group-hover:text-amber-700 dark:group-hover:text-amber-300">
          <span className="text-muted-foreground">[{test.title.replace(/^.*—\s*/, '')}]</span> {part.heading}
        </p>
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {typesOf(part).map((ty) => (
            <li key={ty}>· {TYPE_LABEL[ty].en}</li>
          ))}
        </ul>
        <p className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span>{n} câu</span>
          <span className="font-medium text-amber-700 dark:text-amber-300">{stat ? 'Làm lại →' : 'Làm bài →'}</span>
        </p>
      </div>
    </Link>
  );
}

function FullCard({ test, attempts, loading }: { test: PracticeTest; attempts: IeltsAttempt[]; loading: boolean }) {
  const best = attempts.filter((a) => a.band !== null).sort((a, b) => Number(b.band) - Number(a.band))[0];
  const all = test.parts.map((p) => p.id).join(',');
  return (
    <Card className="flex flex-col overflow-hidden" data-test={test.id}>
      <Cover skill={test.skill}>
        <span className="absolute bottom-0 left-0 rounded-tr-lg bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white">Full đề</span>
        {loading ? null : best ? (
          <Badge className="absolute right-2 top-2">Band tốt nhất {fmtBand(Number(best.band))}</Badge>
        ) : (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-foreground">{attempts.length ? `${attempts.length} lần luyện` : 'Chưa làm'}</span>
        )}
      </Cover>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{test.title}</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden /> {test.minutes} phút · 40 câu · {test.parts.length} {test.skill === 'reading' ? 'passages' : 'parts'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {test.parts.map((p) => (
            <li key={p.id}>
              {p.title}: {p.heading}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/ielts/${test.id}?parts=${all}&mode=exam`}>
              <Play /> Thi thử
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/ielts/${test.id}?parts=${all}&mode=practice`}>Luyện tập</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WeakTypes({ attempts }: { attempts: IeltsAttempt[] }) {
  const stats = statsByType(attempts.flatMap((a) => a.results));
  if (!stats.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Theo dạng câu hỏi</CardTitle>
        <CardDescription>Tất cả các lần luyện — dạng yếu nhất ở trên cùng.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm" data-testid={`types-${attempts[0]?.skill}`}>
          {stats.map((s) => {
            const p = Math.round((s.correct / s.answered) * 100);
            return (
              <li key={s.type}>
                <div className="flex justify-between gap-2">
                  <span>{TYPE_LABEL[s.type].en}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.correct}/{s.answered} · {p}%
                  </span>
                </div>
                <Progress value={p} className="h-1" label={`${TYPE_LABEL[s.type].en} ${p}%`} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function History({ attempts }: { attempts: IeltsAttempt[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lịch sử làm bài</CardTitle>
      </CardHeader>
      <CardContent className="max-h-80 overflow-auto">
        <table className="w-full text-sm" data-testid="ielts-history">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">Ngày</th>
              <th className="py-1 pr-3 font-medium">Phần</th>
              <th className="py-1 pr-3 text-right font-medium">Đúng</th>
              <th className="py-1 text-right font-medium">Band</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {attempts.slice(0, 30).map((a) => {
              const t = testById(a.test_id);
              return (
                <tr key={a.id}>
                  <td className="py-1.5 pr-3 tabular-nums">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    <span className="text-foreground">{t?.title.replace(/^.*—\s*/, '') ?? a.test_id}</span> ·{' '}
                    {t && a.parts.length === t.parts.length ? 'Cả bài' : a.parts.map((p) => t?.parts.find((x) => x.id === p)?.title ?? p).join(', ')} · {a.mode === 'exam' ? 'thi thử' : 'luyện tập'}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {a.correct}/{a.total}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{a.band === null ? '—' : fmtBand(Number(a.band))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
