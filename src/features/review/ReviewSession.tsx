import { CheckCircle2, Clock, RotateCcw, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SpeechErrorNotice } from '@/features/audio/SpeechErrorNotice';
import { useSpeech } from '@/features/audio/useSpeech';
import { useStudySession } from '@/features/dictation/api';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import type { VocabWord } from '@/features/vocabulary/api';
import { toUserMessage } from '@/lib/errors';
import { formatDuration } from '@/lib/format';
import { formatInterval, RATINGS, schedule, type Rating, type SrsMode } from '@/lib/srs/sm2';
import { cn } from '@/lib/utils';
import { useRecordReview } from './api';

export type Direction = 'forward' | 'reverse';

const RATING_UI: Record<Rating, { label: string; className: string }> = {
  again: { label: 'Again', className: 'border-destructive/40 text-destructive hover:bg-destructive/10' },
  hard: { label: 'Hard', className: 'border-warning/50 text-warning hover:bg-warning/10' },
  good: { label: 'Good', className: 'border-success/50 text-success hover:bg-success/10' },
  easy: { label: 'Easy', className: 'border-primary/50 text-primary hover:bg-accent' },
};

/** Highlights the saved word inside its context sentence. */
function Highlight({ text, term }: { text: string; term: string }) {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-primary/15 px-0.5 text-foreground">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

export function ReviewSession({ language, queue: initial, mode, direction, onDone }: {
  language: 'en' | 'zh';
  queue: VocabWord[];
  mode: SrsMode;
  direction: Direction;
  onDone: () => void;
}) {
  const [queue, setQueue] = useState(initial);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Record<Rating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const requeued = useRef(new Map<string, number>());
  const shownAt = useRef(Date.now());
  const record = useRecordReview();
  const speech = useSpeech(language);
  const { activeSeconds } = useStudySession(language, null, 'review');
  const lang = language === 'zh' ? 'zh' : 'en';

  const card = queue[i];
  // Reverse cards need a meaning to show on the front.
  const reverse = direction === 'reverse' && Boolean(card?.meaning_vi);
  const done = i >= queue.length;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [i]);

  const reveal = useCallback(() => {
    if (!card || revealed) return;
    setRevealed(true);
    void speech.play(`r:${card.id}`, card.term, 0.9);
  }, [card, revealed, speech]);

  const rate = useCallback(
    (rating: Rating) => {
      if (!card || !revealed) return;
      const next = schedule(card, rating, mode);
      record.mutate({ word: card, rating, next, durationMs: Date.now() - shownAt.current }, { onError: (e) => toast.error(`Not saved: ${toUserMessage(e)}`) });
      setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
      // "Again" cards come back later in this session (at most twice).
      const n = requeued.current.get(card.id) ?? 0;
      if (rating === 'again' && n < 2) {
        requeued.current.set(card.id, n + 1);
        setQueue((q) => [...q, { ...card, ...next, due_at: next.due_at.toISOString(), last_reviewed_at: new Date().toISOString() }]);
      }
      setRevealed(false);
      setI((x) => x + 1);
    },
    [card, revealed, mode, record],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === ' ' || e.key === 'Enter') && !revealed) {
        e.preventDefault();
        reveal();
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        rate(RATINGS[Number(e.key) - 1]!);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, reveal, rate]);

  if (done) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <div>
          <h2 className="text-2xl font-semibold">Review done</h2>
          <p className="text-muted-foreground">
            {total} {total === 1 ? 'answer' : 'answers'} · <Clock className="inline size-3.5" /> {formatDuration(activeSeconds)}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <Card key={r} className="p-3">
              <p className="text-xl font-semibold tabular-nums">{counts[r]}</p>
              <p className="text-xs text-muted-foreground">{RATING_UI[r].label}</p>
            </Card>
          ))}
        </div>
        <Button onClick={onDone}>
          <RotateCcw /> Back to review overview
        </Button>
      </div>
    );
  }

  // Preview from the exact due time (the stored interval is rounded to 0.01 day ≈ 14 minutes).
  const now = new Date();
  const previews = RATINGS.map((r) => formatInterval((schedule(card!, r, mode, now).due_at.getTime() - now.getTime()) / 86_400_000));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {i + 1} / {queue.length}
        </span>
        <span>{card!.repetitions === 0 && !card!.last_reviewed_at ? 'New card' : `Next interval now: ${formatInterval(Number(card!.interval_days))}`}</span>
      </div>
      <Progress value={(i / queue.length) * 100} label="Review progress" />
      {speech.error && <SpeechErrorNotice error={speech.error} language={language} />}

      <Card className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center" data-testid="flashcard">
        {/* Front */}
        {reverse ? (
          <div className="space-y-2">
            <p className="text-2xl font-medium">{card!.meaning_vi}</p>
            <PosBadge pos={card!.part_of_speech} />
          </div>
        ) : (
          <div className="space-y-2">
            <p className={cn('font-semibold', language === 'zh' ? 'text-5xl' : 'text-4xl')} lang={lang}>
              {card!.term}
            </p>
            <PosBadge pos={card!.part_of_speech} />
          </div>
        )}

        {/* Back */}
        {revealed && (
          <div className="w-full space-y-3 border-t pt-4" data-testid="card-back">
            {reverse && (
              <p className="text-3xl font-semibold" lang={lang}>
                {card!.term}
              </p>
            )}
            <div className="flex items-center justify-center gap-2">
              {card!.reading && <span className="text-lg text-muted-foreground">{card!.reading}</span>}
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Pronounce ${card!.term}`} onClick={() => speech.play(`r2:${card!.id}`, card!.term, 0.9)}>
                <Volume2 />
              </Button>
            </div>
            {!reverse && <p className="text-xl">{card!.meaning_vi ?? <span className="text-muted-foreground">No meaning saved</span>}</p>}
            {card!.context_sentence && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-sm" lang={lang}>
                <Highlight text={card!.context_sentence} term={card!.term} />
              </p>
            )}
            {card!.examples?.[0] && (
              <p className="text-sm text-muted-foreground" lang={lang}>
                <Highlight text={card!.examples[0]} term={card!.term} />
              </p>
            )}
          </div>
        )}
      </Card>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r, k) => (
            <Button key={r} variant="outline" onClick={() => rate(r)} className={cn('h-auto flex-col gap-0.5 py-2', RATING_UI[r].className)}>
              <span className="font-semibold">{RATING_UI[r].label}</span>
              <span className="text-xs opacity-80">
                {previews[k]} · {k + 1}
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <Button className="h-12 w-full" onClick={reveal}>
          Show answer <span className="text-xs opacity-75">(Space)</span>
        </Button>
      )}
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onDone}>
          End session
        </Button>
      </div>
    </div>
  );
}
