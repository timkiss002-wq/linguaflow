import { ArrowRight, CheckCircle2, Keyboard, Lightbulb, RotateCcw, TrendingUp, Volume2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SpeechErrorNotice } from '@/features/audio/SpeechErrorNotice';
import { useSpeech } from '@/features/audio/useSpeech';
import { DiffView } from '@/features/dictation/DiffView';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useRecordTyping, type VocabWord } from './api';
import { useWordFamilyIndex } from '@/features/wordforms/api';
import { PosBadge } from './PosBadge';
import { TypingDots } from './TypingDots';
import { checkTyping, exerciseFor, firstLetterHint, MODE_INFO } from './typing';
import type { CompareResult } from '@/lib/compare';

interface Result {
  id: string;
  term: string;
  correct: boolean;
  levelBefore: number;
  levelAfter: number;
}

/**
 * One pass over the queue. The first answer for each word is what counts (and is saved);
 * after a mistake the learner must type the word correctly once before moving on.
 */
export function TypingPractice({ queue: initialQueue, onRestart }: { queue: VocabWord[]; onRestart: () => void }) {
  const [queue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'answer' | 'retype' | 'done'>('answer');
  const [feedback, setFeedback] = useState<CompareResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [missed, setMissed] = useState(false);
  /** Set while a Pinyin/IME composition is active, so its Enter doesn't submit the answer. */
  const composing = useRef(false);
  const record = useRecordTyping();
  const familyIndex = useWordFamilyIndex();
  const inputRef = useRef<HTMLInputElement>(null);
  const interacted = useRef(false);

  const word = queue[index];
  const language = (word?.language ?? 'en') as 'en' | 'zh';
  const speech = useSpeech(language);
  const exercise = useMemo(() => (word ? exerciseFor(word) : null), [word]);
  const finished = index >= queue.length;

  const speak = () => word && speech.play(`t:${word.id}`, word.term, 0.9);

  useEffect(() => {
    inputRef.current?.focus();
    if (exercise?.mode === 'listen' && interacted.current) speak();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per card
  }, [index]);

  const next = () => {
    setIndex((i) => i + 1);
    setTyped('');
    setPhase('answer');
    setFeedback(null);
    setShowHint(false);
    setMissed(false);
  };

  const submit = () => {
    if (composing.current) return;
    interacted.current = true;
    if (!word || !exercise) return;
    if (phase === 'done') return next();
    if (!typed.trim()) return;
    const result = checkTyping(word, typed, familyIndex?.sameFamily);

    if (phase === 'retype') {
      if (result.isCorrect) setPhase('done');
      else {
        setFeedback(result);
        setTyped('');
      }
      return;
    }

    // First answer for this word: save it and move the typing level.
    record.mutate(
      { id: word.id, mode: exercise.mode, typed, correct: result.isCorrect },
      {
        onSuccess: (updated) =>
          setResults((r) => [...r, { id: word.id, term: word.term, correct: result.isCorrect, levelBefore: word.typing_level, levelAfter: updated.typing_level }]),
        onError: (e) => toast.error(`Not saved: ${toUserMessage(e)}`),
      },
    );
    setFeedback(result);
    if (result.isCorrect) setPhase('done');
    else {
      setMissed(true);
      setPhase('retype');
      setTyped('');
    }
  };

  if (queue.length === 0) return null;

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const up = results.filter((r) => r.levelAfter > r.levelBefore);
    const ready = results.filter((r) => r.levelAfter === 4 && r.levelBefore < 4);
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-semibold">Practice complete</h2>
          <p className="mt-1 text-muted-foreground">
            {correct} of {results.length} right on the first try
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <CheckCircle2 className="mx-auto size-4 text-success" />
            <p className="mt-1 text-2xl font-semibold">{correct}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </Card>
          <Card className="p-4">
            <XCircle className="mx-auto size-4 text-destructive" />
            <p className="mt-1 text-2xl font-semibold">{results.length - correct}</p>
            <p className="text-xs text-muted-foreground">To practise</p>
          </Card>
          <Card className="p-4">
            <TrendingUp className="mx-auto size-4 text-primary" />
            <p className="mt-1 text-2xl font-semibold">{up.length}</p>
            <p className="text-xs text-muted-foreground">Levelled up</p>
          </Card>
        </div>
        {ready.length > 0 && (
          <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
            {ready.map((r) => r.term).join(', ')} {ready.length === 1 ? 'is' : 'are'} now ready for spaced review.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart}>
            <RotateCcw /> Practise more
          </Button>
          <Button variant="outline" asChild>
            <Link to="/vocabulary">Back to notebook</Link>
          </Button>
        </div>
      </div>
    );
  }

  const mode = exercise!.mode;
  const lang = language === 'zh' ? 'zh' : 'en';
  const reveal = mode === 'copy' || phase !== 'answer';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span className="flex items-center gap-2">
          {MODE_INFO[mode].title} <TypingDots level={word!.typing_level} />
        </span>
      </div>
      <Progress value={(index / queue.length) * 100} label="Practice progress" />
      {speech.error && <SpeechErrorNotice error={speech.error} language={language} />}

      <Card className="space-y-5 p-6">
        <p className="text-sm text-muted-foreground">{MODE_INFO[mode].help}</p>

        {/* Prompt */}
        {mode === 'copy' && (
          <div className="text-center">
            <p className="text-3xl font-semibold" lang={lang}>
              {word!.term}
            </p>
            <p className="mt-1 text-muted-foreground">
              {word!.reading} {word!.meaning_vi && `· ${word!.meaning_vi}`}
            </p>
          </div>
        )}
        {mode === 'listen' && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => ((interacted.current = true), speak())}
              aria-label="Play the word"
              className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:scale-105"
            >
              <Volume2 className="size-7" />
            </button>
          </div>
        )}
        {mode === 'meaning' && (
          <div className="text-center">
            <p className="text-2xl font-medium">{word!.meaning_vi}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <PosBadge pos={word!.part_of_speech} />
            </div>
          </div>
        )}
        {mode === 'cloze' && exercise!.cloze && (
          <div className="space-y-2">
            <p className="text-lg leading-relaxed" lang={lang}>
              {exercise!.cloze.before}
              <span className="mx-1 inline-block min-w-16 border-b-2 border-primary text-center font-semibold text-primary">
                {phase === 'answer' ? ' ' : exercise!.cloze.answer}
              </span>
              {exercise!.cloze.after}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PosBadge pos={word!.part_of_speech} />
              {word!.meaning_vi && <span>{word!.meaning_vi}</span>}
            </div>
          </div>
        )}

        {(mode === 'meaning' || mode === 'cloze' || mode === 'listen') && phase === 'answer' && (
          <div className="text-center">
            {showHint ? (
              <p className="font-mono text-lg tracking-widest text-muted-foreground" lang={lang}>
                {firstLetterHint(word!)}
              </p>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                <Lightbulb /> Hint
              </Button>
            )}
          </div>
        )}

        {/* Answer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={() => setTimeout(() => (composing.current = false), 0)}
            onKeyDown={(e) => {
              // Pinyin IME: Enter confirms characters, it must not submit the answer.
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
            }}
            readOnly={phase === 'done'}
            lang={lang}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label={phase === 'retype' ? 'Type the correct word' : 'Your answer'}
            placeholder={phase === 'retype' ? 'Type it correctly to continue…' : 'Type here and press Enter'}
            className={cn(
              'h-12 w-full rounded-md border bg-background px-4 text-center text-xl shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              phase === 'done' && 'border-success bg-success/5',
              phase === 'retype' && 'border-destructive',
            )}
          />

          {phase !== 'answer' && feedback && (
            <div className={cn('rounded-md p-3 text-sm', phase === 'done' && !missed ? 'bg-success/10' : 'bg-muted/60')} aria-live="polite">
              {phase === 'done' && !missed ? (
                <p className="font-medium text-success">Correct!</p>
              ) : phase === 'done' ? (
                <p className="font-medium text-success">Got it now — this word will come back soon.</p>
              ) : (
                <>
                  <p className="mb-1 font-medium text-destructive">Not quite — the answer is:</p>
                  <DiffView result={feedback} language={language} reveal />
                </>
              )}
              {reveal && mode !== 'copy' && (
                <p className="mt-2 text-muted-foreground">
                  <span lang={lang} className="font-medium text-foreground">
                    {word!.term}
                  </span>{' '}
                  {word!.reading} {word!.meaning_vi && `· ${word!.meaning_vi}`}
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={phase !== 'done' && !typed.trim()}>
            {phase === 'done' ? (
              <>
                Next <ArrowRight />
              </>
            ) : (
              <>
                <Keyboard /> Check
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
