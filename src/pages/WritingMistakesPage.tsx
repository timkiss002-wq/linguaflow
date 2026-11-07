import { ArrowRight, Check, RotateCcw, Sparkles, Target, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DiffView } from '@/features/dictation/DiffView';
import { useSubmissions } from '@/features/writing/api';
import { useAllFeedback } from '@/features/writing/feedback';
import {
  CATEGORY_VI,
  bandHistory,
  bandSummary,
  categoryLabel,
  checkFix,
  drillItems,
  recurringMistakes,
  type DrillItem,
  type FeedbackEntry,
} from '@/lib/writing/mistakes';
import { cn } from '@/lib/utils';

const CRITERIA = [
  ['task', 'TR'],
  ['coherence', 'CC'],
  ['lexical', 'LR'],
  ['grammar', 'GRA'],
] as const;
const CRITERION_NAME: Record<string, string> = {
  task: 'Task response',
  coherence: 'Coherence & cohesion',
  lexical: 'Lexical resource',
  grammar: 'Grammatical range & accuracy',
};
const fmt = (b: number) => (Number.isInteger(b) ? `${b}.0` : String(b));

const MASTERED = 'writing-drill-mastered';
function readMastered(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(MASTERED) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function saveMastered(s: Set<string>) {
  try {
    localStorage.setItem(MASTERED, JSON.stringify([...s].slice(-500)));
  } catch {
    /* private mode */
  }
}

export default function WritingMistakesPage() {
  const feedback = useAllFeedback();
  const subs = useSubmissions();
  const [drill, setDrill] = useState<string | null>(null);
  const drillRef = useRef<HTMLDivElement>(null);

  const entries: FeedbackEntry[] = useMemo(() => {
    const byId = new Map((subs.data ?? []).map((s) => [s.id, s]));
    return (feedback.data ?? []).flatMap((f) => {
      const s = byId.get(f.submissionId);
      return s ? [{ submissionId: f.submissionId, title: s.title, createdAt: s.created_at, exam: Boolean(s.metrics.exam), feedback: f.feedback }] : [];
    });
  }, [feedback.data, subs.data]);

  const rows = useMemo(() => bandHistory(entries), [entries]);
  const recurring = useMemo(() => recurringMistakes(entries), [entries]);
  const summary = bandSummary(rows);

  const header = <PageHeader title="Lỗi hay lặp lại" description="Tổng hợp từ các bài tiếng Anh đã được AI chấm: band qua từng bài, những lỗi bạn mắc đi mắc lại, và bài luyện sửa chính các câu của bạn." />;

  if (feedback.isError) return <ErrorState error={feedback.error} onRetry={() => feedback.refetch()} />;
  if (subs.isError) return <ErrorState error={subs.error} onRetry={() => subs.refetch()} />;
  if (feedback.isPending || subs.isPending)
    return (
      <>
        {header}
        <Skeleton className="h-64" />
      </>
    );
  if (!rows.length)
    return (
      <>
        {header}
        <EmptyState
          icon={Sparkles}
          title="Chưa có bài tiếng Anh nào được AI chấm"
          description="Viết một bài (hoặc thi thử 40 phút), lưu lại rồi bấm Get AI feedback. Lỗi của bạn sẽ được tổng hợp ở đây."
          action={
            <Button asChild>
              <Link to="/writing?lang=en">Chọn đề để viết</Link>
            </Button>
          }
        />
      </>
    );

  const startDrill = (cat: string | null) => {
    setDrill(cat ?? 'all');
    setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <>
      {header}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Band trung bình (3 bài gần nhất)" value={summary.recent === null ? '—' : fmt(summary.recent)} hint={summary.change === null ? `${rows.length} bài đã chấm` : `${summary.change >= 0 ? '+' : ''}${summary.change} so với 3 bài trước`} good={summary.change !== null && summary.change > 0} />
        <Stat label="Tiêu chí yếu nhất" value={summary.weakest ? (CRITERIA.find(([k]) => k === summary.weakest)?.[1] ?? summary.weakest) : '—'} hint={summary.weakest ? CRITERION_NAME[summary.weakest] ?? '' : ''} />
        <Stat label="Lỗi lặp lại nhiều nhất" value={recurring[0] ? categoryLabel(recurring[0].category) : '—'} hint={recurring[0] ? `trong ${recurring[0].texts}/${rows.length} bài` : 'chưa có lỗi nào'} small />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Band qua từng bài</CardTitle>
          <CardDescription>Do AI ước lượng — có thể lệch so với giám khảo thật, hãy xem xu hướng hơn là từng con số.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="band-history">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-medium">Ngày</th>
                <th className="py-1 pr-3 font-medium">Bài</th>
                {CRITERIA.map(([k, short]) => (
                  <th key={k} className="py-1 pr-2 text-right font-medium" title={CRITERION_NAME[k]}>
                    {short}
                  </th>
                ))}
                <th className="py-1 text-right font-medium">Band</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...rows].reverse().map((r) => (
                <tr key={r.submissionId}>
                  <td className="py-1.5 pr-3 tabular-nums">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="max-w-[16rem] py-1.5 pr-3">
                    <Link to={`/writing/${r.submissionId}`} className="line-clamp-1 hover:underline">
                      {r.title}
                    </Link>
                    {r.exam && <Badge variant="accent" className="ml-1 text-[10px]">thi thử</Badge>}
                  </td>
                  {CRITERIA.map(([k]) => (
                    <td key={k} className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                      {r.criteria[k] === undefined ? '—' : fmt(r.criteria[k]!)}
                    </td>
                  ))}
                  <td className={cn('py-1.5 text-right font-semibold tabular-nums', r.overall >= 6.5 ? 'text-success' : '')}>{fmt(r.overall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <section className="mt-6" aria-labelledby="recurring">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="recurring" className="text-lg font-semibold">
              Những lỗi bạn hay mắc
            </h2>
            <p className="text-sm text-muted-foreground">Xếp theo số bài có lỗi đó — lỗi nằm trên cùng là lỗi đáng sửa nhất.</p>
          </div>
          {recurring.length > 0 && (
            <Button variant="outline" onClick={() => startDrill(null)}>
              <Target className="size-4" /> Luyện sửa tất cả
            </Button>
          )}
        </div>
        {recurring.length === 0 ? (
          <p className="text-sm text-muted-foreground">AI chưa tìm thấy lỗi nào để sửa. Tuyệt vời!</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recurring.map((r) => (
              <Card key={r.category} data-category={r.category}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{categoryLabel(r.category)}</CardTitle>
                      <CardDescription>
                        {CATEGORY_VI[r.category]} · {r.count} lỗi trong {r.texts}/{rows.length} bài
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => startDrill(r.category)}>
                      Luyện sửa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {r.examples.slice(0, 3).map((c, i) => (
                      <li key={i}>
                        <p lang="en">
                          <span className="text-destructive line-through decoration-destructive/60">{c.original}</span> <ArrowRight className="inline size-3.5 text-muted-foreground" aria-label="becomes" />{' '}
                          <span className="font-medium text-success">{c.corrected}</span>
                        </p>
                        <p className="text-xs text-muted-foreground" lang="vi">
                          {c.explanation_vi}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div ref={drillRef} className="scroll-mt-4">
        {drill && <Drill key={drill} entries={entries} category={drill === 'all' ? undefined : drill} onClose={() => setDrill(null)} />}
      </div>
    </>
  );
}

function Stat({ label, value, hint, good, small }: { label: string; value: string; hint: string; good?: boolean; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('font-bold tabular-nums', small ? 'text-lg leading-7' : 'text-2xl')}>{value}</p>
        <p className={cn('text-xs', good ? 'text-success' : 'text-muted-foreground')}>{hint}</p>
      </CardContent>
    </Card>
  );
}

/** Fix your own sentences again: the original is put back in the box, the learner corrects it. */
function Drill({ entries, category, onClose }: { entries: FeedbackEntry[]; category?: string; onClose: () => void }) {
  const [mastered, setMastered] = useState(readMastered);
  // not yet fixed correctly first, then the rest; at most 15 per round
  const queue = useMemo(() => {
    const all = drillItems(entries, category);
    return [...all.filter((d) => !mastered.has(d.id)), ...all.filter((d) => mastered.has(d.id))].slice(0, 15);
    // the queue is fixed for the round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, category]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const item: DrillItem | undefined = queue[i];
  const [text, setText] = useState(item?.original ?? '');
  const [result, setResult] = useState<ReturnType<typeof checkFix> | null>(null);

  if (!queue.length) return null;
  if (!item)
    return (
      <Card className="mt-6" data-testid="drill-done">
        <CardContent className="space-y-3 pt-5">
          <p className="text-lg font-semibold">
            Xong! Sửa đúng {score}/{queue.length} câu.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setI(0);
                setScore(0);
                setText(queue[0]!.original);
                setResult(null);
              }}
            >
              <RotateCcw className="size-4" /> Làm lại
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </CardContent>
      </Card>
    );

  const check = () => {
    const r = checkFix(text, item);
    setResult(r);
    if (r.ok) {
      setScore((n) => n + 1);
      const next = new Set(mastered).add(item.id);
      setMastered(next);
      saveMastered(next);
    }
  };
  const next = () => {
    const n = queue[i + 1];
    setI(i + 1);
    setText(n?.original ?? '');
    setResult(null);
  };

  return (
    <Card className="mt-6" data-testid="drill">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            Luyện sửa lỗi{category ? `: ${categoryLabel(category)}` : ''}{' '}
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {i + 1}/{queue.length}
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
        <CardDescription>Đây là câu bạn đã viết. Sửa lại cho đúng ngay trong ô bên dưới, rồi bấm Check.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="outline">{categoryLabel(item.category)}</Badge>
        <textarea
          aria-label="Your correction"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (result) next();
            else check();
          }}
          rows={2}
          lang="en"
          spellCheck={false}
          className="w-full rounded-md border bg-card p-3 text-[17px] leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          {!result ? (
            <Button onClick={check} disabled={!text.trim()}>
              <Check className="size-4" /> Check
            </Button>
          ) : (
            <Button onClick={next}>
              {i + 1 < queue.length ? 'Next' : 'Finish'} <ArrowRight className="size-4" />
            </Button>
          )}
          {!result && (
            <Button variant="ghost" onClick={() => setResult(checkFix('', item))}>
              Xem đáp án
            </Button>
          )}
        </div>
        {result && (
          <div className="space-y-2" data-testid="drill-feedback" data-ok={result.ok}>
            <p className={cn('flex items-center gap-1.5 font-medium', result.ok ? 'text-success' : 'text-destructive')}>
              {result.ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
              {result.ok ? 'Đúng rồi!' : 'Chưa đúng — so với bản sửa:'}
            </p>
            {!result.ok && text.trim() && <DiffView result={result.diff} language="en" reveal />}
            <p className="rounded-md bg-muted/50 p-3" lang="en">
              <span className="text-xs text-muted-foreground">Bản sửa: </span>
              <span className="font-medium">{item.corrected}</span>
            </p>
            <p className="text-sm text-muted-foreground" lang="vi">
              {item.explanation_vi}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
