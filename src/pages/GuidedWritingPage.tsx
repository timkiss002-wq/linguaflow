import { BookOpenCheck, ChevronDown, PenLine } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubmissions } from '@/features/writing/api';
import { GUIDED_PROMPTS, GUIDED_TYPES, TASK_RULES, paragraphLabel, templateParts, type GuidedRecord, type GuidedType } from '@/lib/writing/guided';

export default function GuidedWritingPage() {
  const subs = useSubmissions();
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

  return (
    <>
      <PageHeader
        title="IELTS Writing — viết theo khung"
        description="Mỗi dạng đề có một khung cố định, dùng lại cho mọi đề cùng dạng. Học thuộc khung, rồi dịch bài mẫu từng câu từ tiếng Việt sang tiếng Anh, bớt dần gợi ý — đến khi tự viết được trọn bài: Task 1 (150+ từ) và Task 2 (250+ từ)."
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-5 text-sm sm:grid-cols-4">
          {[
            ['0', 'Học khung', 'Gõ lại các cụm cố định của từng câu'],
            ['1–3', 'Dịch từng câu', 'Bài mẫu band 5.5 / 6.5 / 7.5, gợi ý giảm dần'],
            ['4', 'Tự viết cả bài', 'Chỉ có đề bài, như đi thi'],
            ['AI', 'Chấm band', 'Lưu bài → phân tích + AI chấm 4 tiêu chí'],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{n}</span>
              <span>
                <span className="font-medium">{t}</span>
                <span className="block text-muted-foreground">{d}</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p id="exam" className="mb-4 scroll-mt-4 text-sm text-muted-foreground">
        <b className="text-foreground">Thi thử</b>: chỉ có đề bài, đồng hồ đếm ngược (Task 1: 20 phút, Task 2: 40 phút), hết giờ tự nộp, rồi AI chấm band theo 4 tiêu chí. Các lỗi AI tìm được gom lại ở{' '}
        <Link to="/writing/mistakes" className="text-primary hover:underline">
          Lỗi hay lặp lại
        </Link>
        .
      </p>
      {subs.isError && <ErrorState error={subs.error} onRetry={() => subs.refetch()} />}
      {([1, 2] as const).map((task) => (
        <section key={task} className="mb-8 space-y-4" aria-labelledby={`task-${task}`}>
          <div>
            <h2 id={`task-${task}`} className="text-xl font-semibold">
              {task === 1 ? 'Task 1 (Academic) — mô tả biểu đồ' : 'Task 2 — viết luận'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {task === 1
                ? 'Biểu đồ đường, cột, tròn, bảng và sơ đồ quy trình. Khung 4 đoạn: mở bài, overview (không có số liệu), hai đoạn chi tiết. 150+ từ trong 20 phút.'
                : 'Năm dạng đề thường gặp. 250+ từ trong 40 phút.'}
            </p>
          </div>
          {GUIDED_TYPES.filter((t) => t.task === task).map((t) => (
            <TypeCard key={t.id} type={t} best={best} loading={subs.isPending} />
          ))}
        </section>
      ))}
    </>
  );
}

function TypeCard({ type, best, loading }: { type: GuidedType; best: Map<string, Map<number, GuidedRecord>>; loading: boolean }) {
  const prompts = GUIDED_PROMPTS.filter((p) => p.type === type.id);
  return (
    <Card data-type={type.id}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{type.name_vi}</CardTitle>
            <CardDescription lang="en">
              {type.name} · <span className="italic">{type.spot}</span>
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={`/writing/guided/frame/${type.id}`}>
              <BookOpenCheck className="size-4" /> Học khung
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{type.plan_vi}</p>
        <details className="group rounded-md border bg-muted/30 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /> Xem khung ({type.frame.length} câu)
          </summary>
          <div className="mt-2 space-y-2 text-sm" lang="en">
            {[1, 2, 3, 4].map((p) => (
              <div key={p}>
                <p className="text-xs font-medium text-muted-foreground">{paragraphLabel(type, p)}</p>
                <p className="font-mono text-[13px] leading-relaxed">
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
        </details>
        <ul className="divide-y">
          {prompts.map((p) => {
            const levels = best.get(p.id);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5" data-prompt={p.id}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground" lang="en">
                    {p.prompt}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {loading ? (
                      <Skeleton className="h-5 w-24" />
                    ) : levels?.size ? (
                      [...levels.values()]
                        .sort((a, b) => a.level - b.level)
                        .map((g) => (
                          <Badge key={g.level} variant={g.accuracy >= 70 ? 'default' : 'outline'} className="text-xs font-normal">
                            Level {g.level} · {g.accuracy}%
                          </Badge>
                        ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa luyện</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <Button asChild size="sm">
                    <Link to={`/writing/guided/${p.id}`}>
                      <PenLine className="size-4" /> Luyện
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/writing/new/${p.task}?exam=1`}>Thi thử {TASK_RULES[type.task].minutes}′</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
