import { BookOpenCheck, ChevronDown, Filter, PenLine, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, FilterBox, FilterPanel, Radio } from '@/features/ielts/LibraryFilters';
import { useSubmissions } from '@/features/writing/api';
import { TaskChart } from '@/features/writing/guided/TaskChart';
import { GUIDED_PROMPTS, GUIDED_TYPES, TASK_RULES, paragraphLabel, templateParts, type GuidedPrompt, type GuidedRecord, type GuidedType } from '@/lib/writing/guided';
import { cn } from '@/lib/utils';

/**
 * IELTS Writing library, same layout as Reading / Listening:
 * filters on the left (task, question type, status), prompt cards on the right.
 * Above the cards: the frame of each selected type, so "learn the frame" stays one click away.
 * Filters live in the URL (?task=2&type=agree,discuss&status=todo).
 */

type Status = 'all' | 'todo' | 'done';
const TYPE_COLOR = ['bg-orange-500', 'bg-violet-500', 'bg-sky-600', 'bg-emerald-600', 'bg-rose-500', 'bg-amber-600'];

export default function GuidedWritingPage() {
  const subs = useSubmissions();
  const [params, setParams] = useSearchParams();
  const task: 1 | 2 = params.get('task') === '2' ? 2 : 1;
  const status: Status = params.get('status') === 'todo' ? 'todo' : params.get('status') === 'done' ? 'done' : 'all';
  const picked = (params.get('type') ?? '').split(',').filter(Boolean);
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

  /** best saved result per prompt and level */
  const best = useMemo(() => {
    const out = new Map<string, Map<number, GuidedRecord>>();
    for (const s of subs.data ?? []) {
      const g = s.metrics.guided;
      if (!g) continue;
      const byLevel = out.get(g.prompt) ?? new Map<number, GuidedRecord>();
      const prev = byLevel.get(g.level);
      if (!prev || g.accuracy > prev.accuracy) byLevel.set(g.level, g);
      out.set(g.prompt, byLevel);
    }
    return out;
  }, [subs.data]);

  const types = GUIDED_TYPES.filter((t) => t.task === task);
  const shownTypes = picked.length ? types.filter((t) => picked.includes(t.id)) : types;
  const prompts = GUIDED_PROMPTS.filter((p) => shownTypes.some((t) => t.id === p.type)).filter((p) => status === 'all' || (status === 'done') === best.has(p.id));
  const active = (task === 2 ? 1 : 0) + (status !== 'all' ? 1 : 0) + picked.length;
  const rules = TASK_RULES[task];

  const filterBody = (
    <>
      <FilterBox title="Writing" icon={<PenLine className="size-4" aria-hidden />} highlight>
        <Radio name="task" checked={task === 1} onChange={() => setParams({}, { replace: true })} label="Task 1" hint="Mô tả biểu đồ" />
        <Radio name="task" checked={task === 2} onChange={() => setParams({ task: '2' }, { replace: true })} label="Task 2" hint="Viết luận" />
      </FilterBox>
      <FilterBox title="Dạng đề">
        {types.map((t) => (
          <Check
            key={t.id}
            checked={picked.includes(t.id)}
            onChange={(on) => set('type', (on ? [...picked, t.id] : picked.filter((x) => x !== t.id)).join(',') || null)}
            label={
              <>
                {t.name_vi} <span className="text-xs text-muted-foreground">({GUIDED_PROMPTS.filter((p) => p.type === t.id).length})</span>
              </>
            }
          />
        ))}
      </FilterBox>
      <FilterBox title="Trạng thái">
        <Radio name="status" checked={status === 'all'} onChange={() => set('status', null)} label="Tất cả" />
        <Radio name="status" checked={status === 'todo'} onChange={() => set('status', 'todo')} label="Chưa luyện" />
        <Radio name="status" checked={status === 'done'} onChange={() => set('status', 'done')} label="Đã luyện" />
      </FilterBox>
      {(picked.length > 0 || status !== 'all') && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setParams(task === 2 ? { task: '2' } : {}, { replace: true })}>
          <RotateCcw /> Xoá bộ lọc
        </Button>
      )}
    </>
  );

  return (
    <>
      <Steps />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <FilterPanel active={active}>{filterBody}</FilterPanel>

        <section aria-label="Đề Writing" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Luyện đề IELTS Writing Task {task}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{prompts.length} đề</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              {task === 1 ? 'Biểu đồ, bảng, quy trình và bản đồ. Khung 4 đoạn: mở bài, overview (không số liệu), hai đoạn chi tiết.' : 'Năm dạng đề thường gặp, mỗi dạng một khung 4 đoạn.'} {rules.words}+ từ trong {rules.minutes} phút.
            </p>
          </div>

          <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm dark:border-teal-500/30 dark:bg-teal-500/10">
            Còn khó viết câu đúng ngữ pháp? Luyện trước{' '}
            <Link to="/grammar" className="font-medium text-teal-700 hover:underline dark:text-teal-300">
              Ngữ pháp &amp; dịch câu
            </Link>{' '}
            (band 4.5 → 5.5): thì, so sánh, bị động, câu điều kiện, miêu tả xu hướng…
          </p>

          {/* The frame of each type shown: learn it before (or instead of) a prompt. */}
          <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {shownTypes.map((t) => (
              <FrameCard key={t.id} type={t} color={TYPE_COLOR[types.indexOf(t) % TYPE_COLOR.length]!} />
            ))}
          </div>

          {subs.isError && <ErrorState error={subs.error} onRetry={() => subs.refetch()} />}
          {prompts.length === 0 ? (
            <EmptyState icon={Filter} title="Không có đề nào khớp bộ lọc" description="Bỏ bớt dạng đề hoặc đổi trạng thái để xem thêm." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {prompts.map((p) => {
                const type = types.find((t) => t.id === p.type)!;
                return <PromptCard key={p.id} prompt={p} type={type} color={TYPE_COLOR[types.indexOf(type) % TYPE_COLOR.length]!} levels={best.get(p.id)} loading={subs.isPending} />;
              })}
            </div>
          )}

          <p className="mt-8 text-sm text-muted-foreground">
            <b className="text-foreground">Thi thử</b>: chỉ có đề bài, đồng hồ đếm ngược, hết giờ tự nộp, rồi AI chấm band theo 4 tiêu chí. Lỗi AI tìm được gom lại ở{' '}
            <Link to="/writing/mistakes" className="text-primary hover:underline">
              Lỗi hay lặp lại
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}

/** How guided writing works, as one slim strip (it used to be a full card). */
function Steps() {
  return (
    <ol className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 p-4 text-sm sm:grid-cols-4 dark:border-rose-500/30 dark:from-rose-500/10 dark:via-orange-500/5 dark:to-amber-500/10">
      {[
        ['0', 'Học khung', 'Gõ lại các cụm cố định'],
        ['1–3', 'Dịch từng câu', 'Bài mẫu 5.5 / 6.5 / 7.5, gợi ý giảm dần'],
        ['4', 'Tự viết cả bài', 'Chỉ có đề, như đi thi'],
        ['AI', 'Chấm band', '4 tiêu chí + lỗi hay lặp'],
      ].map(([n, t, d]) => (
        <li key={n} className="flex gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">{n}</span>
          <span>
            <span className="font-medium">{t}</span>
            <span className="block text-xs text-muted-foreground">{d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function FrameCard({ type, color }: { type: GuidedType; color: string }) {
  return (
    <details className="group min-w-0 rounded-xl border bg-card px-3 py-2.5" data-type={type.id}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm">
        <span className={cn('size-2.5 shrink-0 rounded-full', color)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-medium">{type.name_vi}</span>
          <span className="block truncate text-xs text-muted-foreground" lang="en">
            {type.spot}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2 space-y-2 border-t pt-2 text-sm">
        <p className="text-xs text-muted-foreground">{type.plan_vi}</p>
        <div className="space-y-1.5" lang="en">
          {[1, 2, 3, 4].map((p) => (
            <div key={p}>
              <p className="text-xs font-medium text-muted-foreground">{paragraphLabel(type, p)}</p>
              <p className="font-mono text-[12px] leading-relaxed">
                {type.frame
                  .filter((s) => s.p === p)
                  .map((s) => (
                    <span key={s.id} className="mr-1" title={s.role_vi}>
                      {templateParts(s).map((x, i) => (x.fixed ? <strong key={i} className="text-rose-700 dark:text-rose-300">{x.text}</strong> : <span key={i}>{x.text}</span>))}
                    </span>
                  ))}
              </p>
            </div>
          ))}
        </div>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to={`/writing/guided/frame/${type.id}`}>
            <BookOpenCheck className="size-4" /> Học khung ({type.frame.length} câu)
          </Link>
        </Button>
      </div>
    </details>
  );
}

function PromptCard({ prompt, type, color, levels, loading }: { prompt: GuidedPrompt; type: GuidedType; color: string; levels?: Map<number, GuidedRecord>; loading: boolean }) {
  const top = levels?.size ? Math.max(...[...levels.values()].map((g) => g.accuracy)) : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md" data-prompt={prompt.id}>
      <Link to={`/writing/guided/${prompt.id}`} className="relative block h-32 overflow-hidden bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:from-rose-500/10 dark:via-orange-500/5 dark:to-amber-500/10" tabIndex={-1} aria-hidden>
        {prompt.chart ? (
          <div className="pointer-events-none origin-top scale-[0.55] select-none px-2 pt-2 [&_button]:hidden [&_figcaption]:hidden">
            <TaskChart chart={prompt.chart} compact />
          </div>
        ) : (
          <p className="line-clamp-4 px-4 pt-4 font-serif text-sm italic text-foreground/60" lang="en">
            “{prompt.prompt}”
          </p>
        )}
        <span className={cn('absolute left-0 top-0 rounded-br-lg px-2.5 py-1 text-xs font-semibold text-white', color)}>{type.name}</span>
        {top !== null && <span className={cn('absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold', top >= 70 ? 'bg-emerald-600 text-white' : 'bg-white/90 text-foreground')}>{top}%</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link to={`/writing/guided/${prompt.id}`} className="font-semibold hover:text-rose-700 dark:hover:text-rose-300">
          {prompt.title}
        </Link>
        <p className="line-clamp-3 text-xs text-muted-foreground" lang="en">
          {prompt.prompt}
        </p>
        <div className="flex flex-wrap gap-1">
          {loading ? (
            <Skeleton className="h-5 w-24" />
          ) : levels?.size ? (
            [...levels.values()]
              .sort((a, b) => a.level - b.level)
              .map((g) => (
                <Badge key={g.level} variant={g.accuracy >= 70 ? 'default' : 'outline'} className="text-[11px] font-normal">
                  Level {g.level} · {g.accuracy}%
                </Badge>
              ))
          ) : (
            <span className="text-xs text-muted-foreground">Chưa luyện</span>
          )}
        </div>
        <div className="mt-auto flex gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to={`/writing/guided/${prompt.id}`}>
              <PenLine className="size-4" /> Luyện
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to={`/writing/new/${prompt.task}?exam=1`}>Thi thử {TASK_RULES[type.task].minutes}′</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
