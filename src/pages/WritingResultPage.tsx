import { AlertTriangle, CheckCircle2, PenLine, Trash2 } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AiFeedback } from '@/features/writing/AiFeedback';
import { useDeleteSubmission, useSubmission, useSubmissions, useWritingProfile } from '@/features/writing/api';
import { toUserMessage } from '@/lib/errors';
import { highlights, levelCounts, type Metrics } from '@/lib/writing/analyze';
import { compareWithPrevious } from '@/lib/writing/tasks';
import { cn } from '@/lib/utils';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const CATEGORY: Record<string, string> = {
  addition: 'adding',
  contrast: 'contrast',
  cause: 'cause',
  result: 'result',
  condition: 'condition',
  example: 'examples',
  sequence: 'order',
  opinion: 'opinion',
  conclusion: 'conclusion',
};

export default function WritingResultPage() {
  const { submissionId = '' } = useParams();
  const sub = useSubmission(submissionId);
  const list = useSubmissions();
  const navigate = useNavigate();
  const del = useDeleteSubmission();
  const s = sub.data;
  const profile = useWritingProfile(s?.language ?? 'en');

  const compare = useMemo(() => {
    if (!s || !list.data) return null;
    const earlier = list.data.filter((x) => x.language === s.language && x.created_at < s.created_at).slice(0, 5);
    return compareWithPrevious(s.metrics, earlier.map((x) => x.metrics));
  }, [s, list.data]);

  if (sub.isError) return <ErrorState error={sub.error} onRetry={() => sub.refetch()} />;
  if (sub.isPending) return <Skeleton className="h-96" />;
  if (!s)
    return (
      <EmptyState
        icon={PenLine}
        title="Text not found"
        action={
          <Button asChild variant="outline">
            <Link to="/writing">Writing</Link>
          </Button>
        }
      />
    );

  const m = s.metrics;
  const zh = s.language === 'zh';
  const unit = zh ? 'characters' : 'words';
  const remove = () => {
    if (!window.confirm('Delete this text and its analysis?')) return;
    del.mutate(s.id, { onSuccess: () => navigate(`/writing?lang=${s.language}`), onError: (e) => toast.error(toUserMessage(e)) });
  };

  return (
    <>
      <PageHeader
        title={s.title}
        description={`${zh ? '中文' : 'English'} · ${new Date(s.created_at).toLocaleString()}${s.duration_seconds ? ` · ${Math.max(1, Math.round(s.duration_seconds / 60))} min` : ''}`}
        actions={
          <>
            {s.task_id && (
              <Button asChild>
                <Link to={`/writing/new/${s.task_id}`}>Write again</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={`/writing?lang=${s.language}`}>Other prompts</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete this text">
              <Trash2 className="size-4" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="writing-tiles">
        <Tile label={zh ? 'Characters' : 'Words'} value={`${m.length}`} hint={m.length >= m.minLength ? `≥ ${m.minLength} ✓` : `task asks for ${m.minLength}+`} good={m.length >= m.minLength} />
        <Tile label="Sentences" value={`${m.sentences}`} hint={`avg ${m.avgSentence} ${unit}, longest ${m.longestSentence}`} />
        <Tile label="Vocabulary variety" value={`${m.variety}%`} hint="different words ÷ all content words" />
        <Tile label="Linking words" value={`${m.linkers.length}`} hint={plural(new Set(m.linkers.map((l) => l.category)).size, 'kind')} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your text</CardTitle>
            <CardDescription className="flex flex-wrap gap-3">
              <span>
                <mark className="rounded bg-success/20 px-1 text-foreground">target word</mark>
              </span>
              <span>
                <mark className="rounded bg-primary/15 px-1 text-foreground underline decoration-primary">linking word</mark>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HighlightedText text={s.body} metrics={m} targets={s.target_words} zh={zh} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card data-testid="writing-checks">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {m.issues.length === 0 ? (
                <p className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-success" aria-hidden /> No problems found by the automatic checks.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {m.issues.map((i) => (
                    <li key={i.code} className="flex gap-2 text-sm" data-issue={i.code}>
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                      <div>
                        <p>{i.message}</p>
                        {i.samples && <p className="text-xs text-muted-foreground">{i.samples.map((x) => `“${x}”`).join(' · ')}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {m.targetUsed.length > 0 && (
                <p className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>
                    Used {m.targetUsed.length} of {s.target_words.length} target words: {m.targetUsed.join(', ')}
                  </span>
                </p>
              )}
              {m.linkers.length > 0 && (
                <p className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>
                    Linking words for{' '}
                    {[...new Set(m.linkers.map((l) => CATEGORY[l.category] ?? l.category))].join(', ')}: {m.linkers.map((l) => l.text.replace(/^i\b/, 'I')).join(', ')}
                  </span>
                </p>
              )}
              <p className="border-t pt-2 text-xs text-muted-foreground">These checks look at form — length, structure, words. They cannot judge grammar or meaning: use AI feedback below for that.</p>
            </CardContent>
          </Card>

          {zh && m.hskLevels && <HskLevels m={m} />}

          <Card data-testid="writing-compare">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Compared with your earlier texts</CardTitle>
            </CardHeader>
            <CardContent>
              {!compare ? (
                <p className="text-sm text-muted-foreground">This is your first {zh ? 'Chinese' : 'English'} text — the next one will be compared with it.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  <Delta label="Vocabulary variety" value={compare.variety} unit=" points" />
                  <Delta label="Average sentence length" value={compare.avgSentence} unit={` ${unit}`} neutral />
                  <Delta label="Kinds of linking words" value={compare.linkerKinds} />
                  <Delta label="Things to fix" value={compare.issues} lowerIsBetter />
                  {compare.aboveLevel !== undefined && <Delta label="Words above your level" value={compare.aboveLevel} />}
                  <li className="pt-1 text-xs text-muted-foreground">vs. the average of your last {compare.count} text{compare.count === 1 ? '' : 's'}</li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <AiFeedback submissionId={s.id} language={s.language} level={profile?.level.value ?? 3} />
      </div>
    </>
  );
}

function Tile({ label, value, hint, good }: { label: string; value: string; hint: string; good?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className={cn('text-xs', good === true ? 'text-success' : good === false ? 'text-warning' : 'text-muted-foreground')}>{hint}</p>
    </Card>
  );
}

function Delta({ label, value, unit = '', lowerIsBetter, neutral }: { label: string; value: number; unit?: string; lowerIsBetter?: boolean; neutral?: boolean }) {
  const better = lowerIsBetter ? value < 0 : value > 0;
  const shown = Math.round(value * 10) / 10;
  return (
    <li className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={cn('tabular-nums', shown === 0 || neutral ? 'text-muted-foreground' : better ? 'text-success' : 'text-destructive')}>
        {shown > 0 ? '+' : ''}
        {shown}
        {unit}
      </span>
    </li>
  );
}

function HskLevels({ m }: { m: Metrics }) {
  const counts = levelCounts(m);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <Card data-testid="hsk-levels">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">HSK level of the words you used</CardTitle>
        <CardDescription>Distinct words, HSK 2.0. “Other” = not in the HSK list (names, rarer words).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((l) => (
            <li key={l} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 text-muted-foreground">{l ? `HSK ${l}` : 'Other'}</span>
              <span className="h-2 flex-1 rounded-full bg-muted">
                <span className="block h-full rounded-full" style={{ width: `${(counts[l]! / total) * 100}%`, background: 'var(--chart-1)' }} />
              </span>
              <span className="w-6 text-right tabular-nums">{counts[l]}</span>
            </li>
          ))}
        </ul>
        {m.aboveLevel && m.aboveLevel.length > 0 && (
          <p className="text-sm">
            <Badge variant="accent">Above your level</Badge>{' '}
            <span lang="zh-CN">{m.aboveLevel.join('、')}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HighlightedText({ text, metrics, targets, zh }: { text: string; metrics: Metrics; targets: string[]; zh: boolean }) {
  const spans = highlights(text, zh ? 'zh' : 'en', targets, metrics.linkers);
  const parts: { text: string; kind?: 'target' | 'linker' }[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start > at) parts.push({ text: text.slice(at, s.start) });
    parts.push({ text: text.slice(s.start, s.end), kind: s.kind });
    at = s.end;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return (
    <div className={cn('whitespace-pre-wrap leading-relaxed', zh && 'text-lg')} lang={zh ? 'zh-CN' : 'en'} data-testid="writing-text">
      {parts.map((p, i) =>
        p.kind ? (
          <mark key={i} data-mark={p.kind} className={cn('rounded px-0.5 text-foreground', p.kind === 'target' ? 'bg-success/20' : 'bg-primary/15 underline decoration-primary')}>
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </div>
  );
}
