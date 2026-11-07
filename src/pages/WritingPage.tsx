import { PenLine } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanProgress } from '@/features/plan/api';
import { useSubmissions, useWritingProfile, useWritingTasks } from '@/features/writing/api';
import { levelLabel } from '@/lib/personal/levels';
import type { Lang } from '@/lib/writing/analyze';
import { pickTasks, type WritingTask } from '@/lib/writing/tasks';
import { cn } from '@/lib/utils';
import { visiblePrompt } from '@/lib/writing/guided';

const LANGS: { value: Lang; name: string; blurb: string }[] = [
  { value: 'en', name: 'English', blurb: 'Paragraphs, emails and IELTS-style letters and essays.' },
  { value: 'zh', name: '中文', blurb: 'HSK-style sentences with given words, short texts and essays in characters.' },
];
const KIND_LABEL = { sentences: 'Sentences', paragraph: 'Paragraph', letter: 'Letter / email', essay: 'Essay' } as const;

export default function WritingPage() {
  const [params, setParams] = useSearchParams();
  const lang = params.get('lang') === 'en' || params.get('lang') === 'zh' ? (params.get('lang') as Lang) : null;

  return (
    <>
      <PageHeader title="Writing" description="Choose a language, pick a prompt, write — then see an automatic analysis of your text." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="Language to write in">
        {LANGS.map((l) => (
          <button
            key={l.value}
            type="button"
            aria-pressed={lang === l.value}
            onClick={() => setParams({ lang: l.value })}
            className={cn('rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary', lang === l.value && 'border-primary ring-2 ring-primary/30')}
          >
            <p className="text-lg font-semibold">{l.name}</p>
            <p className="text-sm text-muted-foreground">{l.blurb}</p>
          </button>
        ))}
      </div>
      {lang ? <LanguageView key={lang} lang={lang} /> : <EmptyState icon={PenLine} title="Which language do you want to write in?" description="Choose English or 中文 above." />}
    </>
  );
}

function LanguageView({ lang }: { lang: Lang }) {
  const tasks = useWritingTasks();
  const subs = useSubmissions();
  const profile = useWritingProfile(lang);
  const today = usePlanProgress().data?.today ?? new Date().toISOString().slice(0, 10);
  const mine = useMemo(() => subs.data?.filter((s) => s.language === lang) ?? [], [subs.data, lang]);

  const picks = useMemo(() => {
    if (!tasks.data || !profile || !subs.data) return undefined;
    const recent = new Set(mine.filter((s) => Date.now() - Date.parse(s.created_at) < 14 * 86_400_000).map((s) => s.task_id ?? ''));
    return pickTasks(tasks.data, { language: lang, level: profile.level.value, interests: profile.interests, exam: profile.exam, recent, today });
  }, [tasks.data, profile, subs.data, mine, lang, today]);

  if (tasks.isError || subs.isError) return <ErrorState error={tasks.error ?? subs.error} onRetry={() => (tasks.refetch(), subs.refetch())} />;
  if (!picks || !profile) return <Skeleton className="h-72" />;
  const others = tasks.data!.filter((t) => t.language === lang && !picks.some((p) => p.task.id === t.id));

  return (
    <div className="space-y-6">
      {lang === 'en' && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10"
          data-testid="guided-entry"
        >
          <span>
            <span className="block font-semibold">IELTS Writing Task 2</span>
            <span className="text-sm text-muted-foreground">Chưa biết viết? Học khung cố định cho mỗi dạng đề và dịch bài mẫu band 5.5 / 6.5 / 7.5 từng câu. Viết được rồi? Thi thử 40 phút và để AI chấm band.</span>
          </span>
          <span className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/writing/guided">Viết theo khung</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/writing/guided#exam">Thi thử 40′</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/writing/mistakes">Lỗi hay lặp lại</Link>
            </Button>
          </span>
        </div>
      )}
      <section aria-labelledby="for-you">
        <h2 id="for-you" className="text-lg font-semibold">
          Prompts for you
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Chosen for {levelLabel(lang, profile.level.value)} — {profile.level.source}.
        </p>
        <div className="grid gap-3 md:grid-cols-3" data-testid="writing-picks">
          {picks.map((p) => (
            <TaskCard key={p.task.id} task={p.task} reasons={p.reasons} lang={lang} />
          ))}
        </div>
      </section>

      <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer font-medium">All {LANGS.find((l) => l.value === lang)!.name} prompts ({others.length + picks.length})</summary>
        <ul className="mt-3 divide-y">
          {others.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {t.title} <span className="text-xs text-muted-foreground">· {KIND_LABEL[t.kind]} · {levelLabel(lang, t.level_min)}{t.level_max > t.level_min ? `–${levelLabel(lang, t.level_max)}` : ''}</span>
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to={`/writing/new/${t.id}`}>Write</Link>
              </Button>
            </li>
          ))}
        </ul>
      </details>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your texts</CardTitle>
          <CardDescription>Each analysis is compared with your earlier texts in the same language.</CardDescription>
        </CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet — pick a prompt above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="writing-history">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Date</th>
                    <th className="py-1 pr-3 font-medium">Prompt</th>
                    <th className="py-1 pr-3 text-right font-medium">{lang === 'zh' ? 'Characters' : 'Words'}</th>
                    <th className="py-1 pr-3 text-right font-medium">Variety</th>
                    <th className="py-1 pr-3 text-right font-medium">Linking words</th>
                    <th className="py-1 text-right font-medium">Checks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mine.map((s) => (
                    <tr key={s.id}>
                      <td className="py-1.5 pr-3 tabular-nums">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="py-1.5 pr-3">
                        <Link to={`/writing/${s.id}`} className="text-primary hover:underline">
                          {s.title}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{s.metrics.length}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{s.metrics.variety}%</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{s.metrics.linkers.length}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.metrics.issues.length === 0 ? '✓' : `${s.metrics.issues.length} to fix`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCard({ task, reasons, lang }: { task: WritingTask; reasons: string[]; lang: Lang }) {
  return (
    <Card className="flex flex-col" data-task={task.id}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{KIND_LABEL[task.kind]}</Badge>
          {task.exam !== 'general' && <Badge variant="accent">{task.exam.toUpperCase()}</Badge>}
        </div>
        <CardTitle className="text-base" lang={lang === 'zh' ? 'zh-CN' : 'en'}>
          {task.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          <p className="line-clamp-3 text-sm" lang={lang === 'zh' ? 'zh-CN' : 'en'}>
            {visiblePrompt(task.prompt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {task.min_length}
            {task.max_length ? `–${task.max_length}` : '+'} {lang === 'zh' ? 'characters' : 'words'} · {reasons.join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={`/writing/new/${task.id}`}>Write</Link>
          </Button>
          {task.exam === 'ielts' && task.kind === 'essay' && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/writing/new/${task.id}?exam=1`}>Thi thử {task.min_length <= 150 ? 20 : 40}′</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
