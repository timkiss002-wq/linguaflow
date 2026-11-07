import { BookOpen, Clock, Filter, Headphones, Play, RotateCcw, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
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
              className="mt-0.5 size-4 accent-[hsl(var(--primary))]"
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
              IELTS {S.label}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{count} {format === 'full' ? 'đề' : 'bài'}</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">{S.intro}</p>
          </div>

          {count === 0 ? (
            <EmptyState icon={Filter} title="Không có bài nào khớp bộ lọc" description="Bỏ bớt dạng câu hỏi hoặc đổi trạng thái để xem thêm." />
          ) : format === 'part' ? (
            <PartTable rows={partCards} unit={S.unit} stats={partStats} loading={attempts.isPending} />
          ) : (
            <FullTable tests={fullCards} attempts={mine} loading={attempts.isPending} />
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
    <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="text-sm">
          <p className="font-semibold">
            Mục tiêu band {fmtBand(goal.band)} · {skill === 'reading' ? 'Reading' : 'Listening'}
            {goal.isDefault && (
              <Link to="/onboarding" className="ml-2 text-xs font-normal text-primary hover:underline">
                Đặt mục tiêu của bạn
              </Link>
            )}
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

/** Minutes for one part: the test's time shared evenly (Reading 60 min / 3 passages = 20). */
const partMinutes = (t: PracticeTest) => Math.round(t.minutes / t.parts.length);

const TH = 'px-3 py-2 text-left text-xs font-medium text-muted-foreground';
const TD = 'px-3 py-2.5 align-top';

/**
 * Single passages / parts as a compact table — on a desktop a table is quicker to scan than a grid of cards.
 * "Lần làm" is the learner's own attempts, not everyone's.
 */
function PartTable({ rows, unit, stats, loading }: { rows: { t: PracticeTest; p: TestPart; i: number }[]; unit: string; stats: Map<string, PartStat>; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm" data-testid="part-table">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className={TH}>Bài</th>
            <th className={TH}>Dạng câu hỏi</th>
            <th className={cn(TH, 'text-right')}>Thời lượng</th>
            <th className={cn(TH, 'text-right')}>Điểm gần nhất</th>
            <th className={cn(TH, 'text-right')}>Bạn đã làm</th>
            <th className={TH}>
              <span className="sr-only">Làm bài</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ t, p, i }) => {
            const stat = stats.get(p.id);
            const pct = stat && stat.total ? Math.round((stat.correct / stat.total) * 100) : null;
            const to = `/ielts/${t.id}?parts=${p.id}&mode=practice`;
            return (
              <tr key={p.id} className="group hover:bg-muted/40" data-part={p.id}>
                <td className={TD}>
                  <Link to={to} className="font-semibold hover:text-primary hover:underline">
                    {p.heading}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t.title.replace(/^.*—\s*/, '')} · {unit} {i + 1} · {partQuestions(p).length} câu
                  </p>
                </td>
                <td className={cn(TD, 'text-xs text-muted-foreground')}>{typesOf(p).map((ty) => TYPE_LABEL[ty].en).join(' · ')}</td>
                <td className={cn(TD, 'whitespace-nowrap text-right tabular-nums')}>{partMinutes(t)} phút</td>
                <td className={cn(TD, 'text-right tabular-nums')}>
                  {loading ? '…' : pct === null ? <span className="text-muted-foreground">—</span> : <span className={cn('font-semibold', pct >= 70 ? 'text-success' : '')}>{pct}%</span>}
                </td>
                <td className={cn(TD, 'whitespace-nowrap text-right tabular-nums text-muted-foreground')}>{loading ? '…' : stat ? `${stat.tries} lần` : 'Chưa làm'}</td>
                <td className={cn(TD, 'text-right')}>
                  <Button asChild size="sm" variant={stat ? 'outline' : 'default'}>
                    <Link to={to}>{stat ? 'Làm lại' : 'Làm bài'}</Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FullTable({ tests, attempts, loading }: { tests: PracticeTest[]; attempts: IeltsAttempt[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm" data-testid="full-table">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className={TH}>Đề</th>
            <th className={TH}>Các phần</th>
            <th className={cn(TH, 'text-right')}>Thời lượng</th>
            <th className={cn(TH, 'text-right')}>Band tốt nhất</th>
            <th className={cn(TH, 'text-right')}>Bạn đã làm</th>
            <th className={TH}>
              <span className="sr-only">Làm bài</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tests.map((t) => {
            const mine = attempts.filter((a) => a.test_id === t.id);
            const best = mine.filter((a) => a.band !== null).sort((a, b) => Number(b.band) - Number(a.band))[0];
            const all = t.parts.map((p) => p.id).join(',');
            return (
              <tr key={t.id} className="hover:bg-muted/40" data-test={t.id}>
                <td className={cn(TD, 'font-semibold')}>{t.title}</td>
                <td className={cn(TD, 'text-xs text-muted-foreground')}>
                  {t.parts.map((p) => (
                    <span key={p.id} className="block">
                      {p.title}: {p.heading}
                    </span>
                  ))}
                </td>
                <td className={cn(TD, 'whitespace-nowrap text-right tabular-nums')}>
                  <Clock className="mr-1 inline size-3.5 text-muted-foreground" aria-hidden />
                  {t.minutes} phút
                </td>
                <td className={cn(TD, 'text-right font-semibold tabular-nums')}>{loading ? '…' : best ? fmtBand(Number(best.band)) : <span className="font-normal text-muted-foreground">—</span>}</td>
                <td className={cn(TD, 'whitespace-nowrap text-right tabular-nums text-muted-foreground')}>{loading ? '…' : mine.length ? `${mine.length} lần` : 'Chưa làm'}</td>
                <td className={cn(TD, 'whitespace-nowrap text-right')}>
                  <div className="flex justify-end gap-1.5">
                    <Button asChild size="sm">
                      <Link to={`/ielts/${t.id}?parts=${all}&mode=exam`}>
                        <Play /> Thi thử
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/ielts/${t.id}?parts=${all}&mode=practice`}>Luyện tập</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
