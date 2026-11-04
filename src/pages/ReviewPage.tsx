import { CalendarClock, Layers, Play, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/features/profile/api';
import { DEFAULT_SETTINGS } from '@/features/profile/schemas';
import { useNewReviewedToday } from '@/features/review/api';
import { buildReviewQueue, forecast } from '@/features/review/queue';
import { ReviewSession, type Direction } from '@/features/review/ReviewSession';
import { useVocabulary, type VocabWord } from '@/features/vocabulary/api';
import { cn } from '@/lib/utils';
import type { SrsMode } from '@/lib/srs/sm2';

export default function ReviewPage() {
  const vocab = useVocabulary();
  const newToday = useNewReviewedToday();
  const settings = useProfile().data?.settings ?? DEFAULT_SETTINGS;
  const [params, setParams] = useSearchParams();
  const [direction, setDirection] = useState<Direction>('forward');
  const [session, setSession] = useState<VocabWord[] | null>(null);

  if (vocab.isError || newToday.isError) return <ErrorState error={vocab.error ?? newToday.error} onRetry={() => (vocab.refetch(), newToday.refetch())} />;
  if (!vocab.data || !newToday.data) return <Skeleton className="h-96" />;

  const words = vocab.data;
  const mode: SrsMode = settings.srsMode === 'fixed' ? { mode: 'fixed', intervals: settings.fixedIntervals } : { mode: 'sm2' };
  const deck = (language: 'en' | 'zh') =>
    buildReviewQueue(words, {
      language,
      newLimit: settings.newPerDay,
      newDoneToday: words.filter((w) => w.language === language && newToday.data.has(w.id)).length,
    });
  const en = deck('en');
  const zh = deck('zh');
  const requested = params.get('lang');
  const language: 'en' | 'zh' = requested === 'en' || requested === 'zh' ? requested : zh.queue.length > en.queue.length ? 'zh' : 'en';
  const current = language === 'en' ? en : zh;

  if (session) return <ReviewSession language={language} queue={session} mode={mode} direction={direction} onDone={() => setSession(null)} />;

  const days = forecast(words, language);
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <>
      <PageHeader
        title="Review"
        description={settings.srsMode === 'fixed' ? `Fixed intervals: ${settings.fixedIntervals.join(' / ')} days (change in Settings).` : 'Spaced repetition (SM-2): cards come back right before you would forget them.'}
      />
      <div className="mb-5 flex gap-1 rounded-md border bg-card p-1 w-fit" role="group" aria-label="Language">
        {(['en', 'zh'] as const).map((l) => {
          const n = (l === 'en' ? en : zh).queue.length;
          return (
            <button
              key={l}
              type="button"
              aria-pressed={language === l}
              onClick={() => setParams({ lang: l }, { replace: true })}
              className={cn('rounded px-3 py-1.5 text-sm font-medium', language === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              {l === 'en' ? 'English' : '中文'} <span className="opacity-75">{n}</span>
            </button>
          );
        })}
      </div>

      {current.counts.total === 0 ? (
        <EmptyState
          icon={Layers}
          title="No cards yet"
          description="Every word you save to your notebook becomes a flashcard."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/lessons">Find words in a lesson</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Due now</p>
              <p className="text-3xl font-semibold tabular-nums" data-testid="due-now">{current.counts.due}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">New today</p>
              <p className="text-3xl font-semibold tabular-nums" data-testid="new-today">
                {current.counts.newLeftToday}
                <span className="text-base font-normal text-muted-foreground"> / {settings.newPerDay}</span>
              </p>
              <p className="text-xs text-muted-foreground">{current.counts.newAvailable} new cards waiting</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total cards</p>
              <p className="text-3xl font-semibold tabular-nums">{current.counts.total}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-4" /> Next 7 days
              </p>
              <div className="mt-2 flex h-12 items-end gap-1" aria-label="Upcoming reviews per day" data-testid="forecast">
                {days.map((d) => (
                  <div key={d.date.toISOString()} className="flex flex-1 flex-col items-center gap-0.5" title={`${d.date.toLocaleDateString()}: ${d.count}`}>
                    <div className="w-full rounded-sm bg-primary/70" style={{ height: `${Math.max(2, (d.count / max) * 40)}px` }} />
                    <span className="text-[10px] text-muted-foreground">{d.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="rv-dir">Card front</Label>
              <NativeSelect id="rv-dir" value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="w-64">
                <option value="forward">Word → meaning</option>
                <option value="reverse">Meaning → word</option>
              </NativeSelect>
            </div>
            {current.queue.length > 0 ? (
              <Button size="lg" onClick={() => setSession(current.queue)}>
                <Play /> Start review · {current.queue.length} cards
              </Button>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-success" /> All done for now — come back later.
              </p>
            )}
          </Card>
          <p className="text-xs text-muted-foreground">Keys: Space = show answer · 1 Again · 2 Hard · 3 Good · 4 Easy</p>
        </div>
      )}
    </>
  );
}
