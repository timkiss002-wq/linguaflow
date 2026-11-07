import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ERROR_LABELS } from '@/features/dictation/errorLabels';
import { formatStudyTime, useDailyActivity, useLearningStats, type StatsLanguage } from '@/features/stats/api';
import { AccuracyChart, HBarList, StudyTimeChart } from '@/features/stats/charts';
import { LanguageSwitch } from '@/features/stats/LanguageSwitch';
import { useStatsLanguage } from '@/features/stats/useStatsLanguage';
import { WeakSpots } from '@/features/wordforms/WeakSpots';
import type { ErrorKind } from '@/lib/compare';
import { cn } from '@/lib/utils';

const RANGES = [7, 30, 90] as const;

export default function StatisticsPage() {
  const [lang, setLang] = useStatsLanguage();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const stats = useLearningStats(lang, days);
  const activity = useDailyActivity(lang, days);
  const s = stats.data;

  const errors = s
    ? (Object.entries(s.errors) as [ErrorKind, number][])
        .filter(([k, v]) => v > 0 && k in ERROR_LABELS)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ label: ERROR_LABELS[k].label, value: v, hint: ERROR_LABELS[k].tip }))
    : [];
  const totalErrors = errors.reduce((n, e) => n + e.value, 0);
  const zhSound = s ? (s.errors.tone ?? 0) + (s.errors.wrong_character ?? 0) : 0;

  return (
    <>
      <PageHeader
        title="Thống kê"
        description="Thời gian học đi vào đâu, khả năng nghe tiến bộ ra sao, lỗi nào hay lặp lại."
        actions={
          <>
            <LanguageSwitch value={lang} onChange={setLang as (l: StatsLanguage) => void} />
            <div className="flex gap-1 rounded-md border bg-card p-1" role="group" aria-label="Range">
              {RANGES.map((d) => (
                <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cn('rounded px-2.5 py-1.5 text-sm font-medium', days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  {d}d
                </button>
              ))}
            </div>
          </>
        }
      />

      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      ) : !s || !activity.data ? (
        <Skeleton className="h-96" />
      ) : s.total_seconds === 0 && s.attempts === 0 && s.words === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Practise a lesson or review some words — your statistics will appear here." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="stats-tiles">
            {[
              ['Study time', formatStudyTime(s.period_seconds), `last ${days} days`],
              ['Sentences checked', String(s.attempts), `last ${days} days`],
              ['Listening accuracy', s.avg_accuracy === null ? '—' : `${s.avg_accuracy}%`, `last ${days} days`],
              ['Sentences finished', String(s.sentences_finished), 'all time'],
            ].map(([label, value, hint]) => (
              <Card key={label} className="p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Study time per day</CardTitle>
              </CardHeader>
              <CardContent>
                <StudyTimeChart data={activity.data} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Listening accuracy per week</CardTitle>
              </CardHeader>
              <CardContent>{s.weekly_accuracy.length ? <AccuracyChart data={s.weekly_accuracy} /> : <p className="py-16 text-center text-sm text-muted-foreground">No dictation yet.</p>}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mistake types</CardTitle>
              </CardHeader>
              <CardContent data-testid="mistakes">
                {errors.length ? (
                  <>
                    <HBarList items={errors} />
                    {lang === 'zh' && zhSound > 0 && (
                      <p className="mt-4 rounded-md bg-muted/60 p-2.5 text-sm">
                        {Math.round((zhSound / totalErrors) * 100)}% of your Chinese mistakes are <strong>tone</strong> or <strong>same-sound character</strong> errors — you heard
                        the syllable, but wrote the wrong tone or 汉字.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No mistakes recorded in this period.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Most confused</CardTitle>
              </CardHeader>
              <CardContent>
                {s.confusions.length ? (
                  <table className="w-full text-sm" data-testid="confusions">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="pb-2 font-medium">Correct</th>
                        <th className="pb-2 font-medium">You wrote</th>
                        <th className="pb-2 text-right font-medium">Times</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {s.confusions.map((c) => (
                        <tr key={c.expected + c.typed}>
                          <td className="py-1.5 font-medium text-success">{c.expected}</td>
                          <td className="py-1.5 text-destructive line-through">{c.typed}</td>
                          <td className="py-1.5 text-right tabular-nums">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nothing confused yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vocabulary</CardTitle>
              </CardHeader>
              <CardContent>
                <HBarList
                  items={(['new', 'learning', 'reviewing', 'mastered'] as const).map((k) => ({ label: k[0]!.toUpperCase() + k.slice(1), value: s.words_by_status[k] }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Flashcard answers</CardTitle>
              </CardHeader>
              <CardContent>
                <HBarList items={(['again', 'hard', 'good', 'easy'] as const).map((k) => ({ label: k[0]!.toUpperCase() + k.slice(1), value: s.reviews[k] ?? 0 }))} />
              </CardContent>
            </Card>
          </div>

          {lang !== 'zh' && (
            <div>
              <h2 className="mb-2 text-base font-semibold">Word forms (English)</h2>
              <WeakSpots />
            </div>
          )}
        </div>
      )}
    </>
  );
}
