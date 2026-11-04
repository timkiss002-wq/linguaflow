import { ArrowLeft, ArrowRight, CheckCheck, Eye, Languages, Lightbulb, SkipForward } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/features/auth/useAuth';
import { SpeechErrorNotice } from '@/features/audio/SpeechErrorNotice';
import { useSpeech } from '@/features/audio/useSpeech';
import { SentenceText } from '@/features/lessons/SentenceText';
import type { LessonSummary, Sentence } from '@/features/library/api';
import { useProfile } from '@/features/profile/api';
import { DEFAULT_SETTINGS } from '@/features/profile/schemas';
import { useWordLookup } from '@/features/vocabulary/useWordLookup';
import { useWordFamilyIndex } from '@/features/wordforms/api';
import { compareAnswer } from '@/lib/compare';
import { nextHint } from '@/lib/compare/hint';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { touchProgress, useRecordAttempt, useStudySession, useWordsSavedSince, type AttemptInput } from './api';
import { AudioPanel, SLOW_RATE } from './AudioPanel';
import { DiffView, ErrorChips } from './DiffView';
import { Kbd } from './Kbd';
import { initialState, isDone, reducer, summarizeSession } from './session';
import { SessionSummary } from './SessionSummary';

interface Props {
  lesson: LessonSummary;
  sentences: Sentence[];
  startIndex: number;
  previouslyFinished: Set<string>;
}

export function DictationRoom({ lesson, sentences, startIndex, previouslyFinished }: Props) {
  const user = useUser();
  const language = lesson.language as 'en' | 'zh';
  const lessonId = lesson.id!;
  const settings = useProfile().data?.settings ?? DEFAULT_SETTINGS;

  // The sentences being practised (all of them, or only the ones to retry).
  const [ids, setIds] = useState(() => sentences.map((s) => s.id));
  const byId = useMemo(() => new Map(sentences.map((s) => [s.id, s])), [sentences]);
  const [state, dispatch] = useReducer(useMemo(() => reducer(ids), [ids]), undefined, () => initialState(ids, startIndex, Date.now()));
  const sentence = byId.get(ids[state.index]!)!;
  const entry = state.entries[sentence.id];
  const done = isDone(entry);

  const [volume, setVolume] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const currentRate = rate ?? settings.playbackRate;
  const currentVolume = volume ?? settings.volume;
  const speech = useSpeech(language, { volume: currentVolume });
  const lookup = useWordLookup(language);
  const familyIndex = useWordFamilyIndex();
  const [showPinyin, setShowPinyin] = useState<boolean | null>(null);
  const pinyinOn = showPinyin ?? settings.showPinyin;

  const { activeSeconds, ensureSession } = useStudySession(language, lessonId);
  const [startedAt] = useState(() => new Date().toISOString());
  const record = useRecordAttempt(lessonId);
  const ready = useRef<Promise<void> | null>(null);
  const interacted = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ready.current = touchProgress(user.id, lessonId).catch((e) => {
      toast.error(toUserMessage(e));
    });
  }, [user.id, lessonId]);

  // ── audio ──
  const playing = speech.playingKey?.startsWith('loop') ? 'loop' : speech.playingKey?.startsWith('slow') ? 'slow' : speech.playingKey ? 'normal' : null;
  const play = useCallback(() => {
    interacted.current = true;
    void speech.play(`n:${sentence.id}`, sentence.text, currentRate);
  }, [speech, sentence, currentRate]);
  const playSlow = () => void speech.play(`slow:${sentence.id}`, sentence.text, SLOW_RATE);
  const playLoop = () => void speech.loop(sentence.id, sentence.text, currentRate);

  // Auto-play each new sentence once the learner has interacted (browsers block audio before that).
  useEffect(() => {
    inputRef.current?.focus();
    if (interacted.current) void speech.play(`n:${sentence.id}`, sentence.text, currentRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the sentence changes
  }, [sentence.id]);

  // ── persistence ──
  const finishedAfter = (extra: string) => {
    const all = new Set(previouslyFinished);
    for (const [id, e] of Object.entries(state.entries)) if (isDone(e)) all.add(id);
    all.add(extra);
    return sentences.every((s) => all.has(s.id));
  };
  const save = async (a: Omit<AttemptInput, 'sessionId' | 'sentenceId' | 'durationMs'>, completes: boolean) => {
    const startedAt = entry?.startedAt ?? Date.now();
    const [sessionId] = await Promise.all([ensureSession(), ready.current]);
    record.mutate(
      {
        ...a,
        sentenceId: sentence.id,
        sessionId,
        durationMs: Date.now() - startedAt,
        position: sentence.position,
        lessonCompleted: completes,
      },
      { onError: (e) => toast.error(`Could not save your answer: ${toUserMessage(e)}`) },
    );
  };

  // ── actions ──
  const compare = () =>
    compareAnswer(language, sentence.text, entry?.input ?? '', {
      ignorePunctuation: settings.ignorePunctuation,
      // English: typing another form of the same word family is reported as 'word form'.
      sameFamily: language === 'en' ? familyIndex?.sameFamily : undefined,
    });

  const goTo = useCallback((index: number) => dispatch({ type: 'goto', index, now: Date.now() }), []);
  const next = useCallback(() => {
    interacted.current = true;
    if (state.index >= ids.length - 1) {
      speech.stop();
      dispatch({ type: 'finish' });
    } else goTo(state.index + 1);
  }, [state.index, ids.length, goTo, speech]);

  const check = () => {
    interacted.current = true;
    if (done) return next();
    if (!entry?.input.trim()) {
      toast.info('Type what you hear first.');
      return;
    }
    const result = compare();
    dispatch({ type: 'check', id: sentence.id, result });
    void save({ input: entry.input, result, hintsUsed: entry.hints }, result.isCorrect && finishedAfter(sentence.id));
    if (result.isCorrect && settings.autoNext) setTimeout(next, 1200);
  };

  const hint = () => {
    if (done) return;
    const h = nextHint(language, sentence.text, compare(), entry?.lastHint?.target ?? null);
    if (h) dispatch({ type: 'hint', id: sentence.id, hint: h });
    else toast.info('Everything you typed is right — press Check.');
  };

  const reveal = () => {
    if (done) return;
    const result = compare();
    dispatch({ type: 'reveal', id: sentence.id });
    void save({ input: entry?.input ?? '', result, hintsUsed: entry?.hints ?? 0, revealed: true }, finishedAfter(sentence.id));
  };

  const skip = () => {
    if (done) return next();
    void save({ input: entry?.input ?? '', result: null, hintsUsed: entry?.hints ?? 0, skipped: true }, false);
    if (state.index >= ids.length - 1) dispatch({ type: 'finish' });
    else dispatch({ type: 'skip', id: sentence.id });
  };

  // ── keyboard ──
  const actions = useRef({ play, playSlow, hint, reveal, next, prev: () => goTo(state.index - 1) });
  actions.current = { play, playSlow, hint, reveal, next, prev: () => goTo(state.index - 1) };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const map: Record<string, () => void> = {
        KeyR: actions.current.play,
        KeyS: actions.current.playSlow,
        KeyH: actions.current.hint,
        KeyA: actions.current.reveal,
        ArrowRight: actions.current.next,
        ArrowLeft: actions.current.prev,
      };
      const fn = map[e.code];
      if (fn) {
        e.preventDefault();
        interacted.current = true;
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onInputKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter while an IME (pinyin keyboard) is composing must only confirm the characters.
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    check();
  };

  // ── summary ──
  const summary = useMemo(() => summarizeSession(ids, state.entries), [ids, state.entries]);
  const words = useWordsSavedSince(lessonId, startedAt, state.finished);
  if (state.finished) {
    const restart = (list: string[]) => {
      setIds(list);
      dispatch({ type: 'reset', index: 0, now: Date.now() });
    };
    return (
      <SessionSummary
        summary={summary}
        seconds={activeSeconds}
        wordsSaved={words.data}
        retry={summary.retryIds.map((id) => byId.get(id)!).filter(Boolean)}
        language={language}
        lessonId={lessonId}
        onRetry={() => restart(summary.retryIds)}
        onRestart={() => restart(sentences.map((s) => s.id))}
      />
    );
  }

  const doneCount = ids.filter((id) => previouslyFinished.has(id) || isDone(state.entries[id])).length;
  // After "Show answer" the diff is recomputed against what was typed, even if never checked.
  // Revealed with nothing typed: the answer block below says it all, skip the all-missing diff.
  const result = entry?.revealed ? (entry.input.trim() ? compare() : null) : (entry?.result ?? null);
  const [title, subtitle] = (lesson.title ?? '').split(' · ');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={`/lessons/${lessonId}`}>
            <ArrowLeft /> <span lang={language === 'zh' ? 'zh' : undefined}>{title}</span>
            {subtitle && <span className="hidden text-muted-foreground sm:inline">· {subtitle}</span>}
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          {doneCount} / {ids.length} done
        </span>
      </div>
      <Progress value={(doneCount / ids.length) * 100} label="Lesson progress" />

      <nav aria-label="Sentences" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {ids.map((id, i) => {
          const e = state.entries[id];
          const finished = isDone(e) || previouslyFinished.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === state.index ? 'step' : undefined}
              aria-label={`Sentence ${byId.get(id)!.position}${finished ? ', done' : e?.skipped ? ', skipped' : ''}`}
              className={cn(
                'size-8 shrink-0 rounded-md border text-xs font-medium tabular-nums transition-colors',
                finished ? 'border-success/40 bg-success/10 text-success' : e?.skipped ? 'border-warning/40 bg-warning/10 text-warning' : 'bg-card text-muted-foreground hover:bg-muted',
                i === state.index && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
              )}
            >
              {byId.get(id)!.position}
            </button>
          );
        })}
      </nav>

      {speech.error && <SpeechErrorNotice error={speech.error} language={language} />}
      {lookup.popover}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <AudioPanel
          playing={playing}
          rate={currentRate}
          volume={currentVolume}
          onPlay={play}
          onSlow={playSlow}
          onLoop={playLoop}
          onStop={speech.stop}
          onRate={setRate}
          onVolume={setVolume}
        />

        <Card className="flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              Sentence {state.index + 1} <span className="font-normal text-muted-foreground">/ {ids.length}</span>
            </h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => goTo(state.index - 1)} disabled={state.index === 0} aria-label="Go to previous sentence">
                <ArrowLeft />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => goTo(state.index + 1)} disabled={state.index === ids.length - 1} aria-label="Go to next sentence">
                <ArrowRight />
              </Button>
            </div>
          </div>

          <textarea
            ref={inputRef}
            value={entry?.input ?? ''}
            onChange={(e) => dispatch({ type: 'input', id: sentence.id, value: e.target.value })}
            onKeyDown={onInputKey}
            readOnly={done}
            rows={3}
            lang={language === 'zh' ? 'zh' : 'en'}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Type what you hear"
            placeholder={language === 'zh' ? '听写你听到的句子…（用拼音输入法输入汉字）' : 'Type what you hear…'}
            className={cn(
              'w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              done && 'bg-muted/50',
            )}
          />

          {entry?.lastHint && !done && (
            <p className="mt-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
              <Lightbulb className="mr-1.5 inline size-4" />
              {language === 'zh' ? 'Character' : 'Word'} {entry.lastHint.position}:{' '}
              <span className="font-mono font-semibold tracking-wider" lang={language === 'zh' && entry.lastHint.level === 2 ? 'zh' : undefined}>
                {entry.lastHint.text}
              </span>
              {entry.lastHint.level === 1 && <span className="ml-2 text-xs opacity-75">(press Hint again to see it)</span>}
            </p>
          )}

          {result && (
            <div className="mt-4 space-y-2 rounded-md border p-3" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn('text-sm font-semibold', entry?.revealed ? 'text-muted-foreground' : result.isCorrect ? 'text-success' : 'text-foreground')}>
                  {entry?.revealed ? `Answer shown · you had ${result.accuracy}%` : result.isCorrect ? 'Correct!' : `${result.accuracy}% correct — keep going`}
                </p>
                {!result.isCorrect && <ErrorChips result={result} ignorePunctuation={settings.ignorePunctuation} />}
              </div>
              <DiffView result={result} language={language} reveal={done} />
            </div>
          )}

          {done && (
            <div className="mt-3 space-y-2 rounded-md bg-muted/60 p-3">
              {entry?.revealed && !result && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer shown</p>}
              <div className="flex items-start justify-between gap-2">
                <SentenceText
                  text={sentence.text}
                  language={language}
                  showPinyin={pinyinOn}
                  pinyinOverride={sentence.pinyin}
                  className="text-lg"
                  onWordClick={(word, element) =>
                    lookup.open({ word, element, sentence: sentence.text, sentenceTranslation: sentence.translation_vi, lessonId, sentenceId: sentence.id })
                  }
                />
                {language === 'zh' && (
                  <Button variant="ghost" size="sm" aria-pressed={pinyinOn} onClick={() => setShowPinyin(!pinyinOn)}>
                    Pinyin
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Click a word to look it up and save it.</p>
              {sentence.translation_vi && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Languages className="size-4 shrink-0" /> {sentence.translation_vi}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {done ? (
              <Button onClick={next} className="min-w-32">
                {state.index >= ids.length - 1 ? 'Finish' : 'Next sentence'} <ArrowRight />
              </Button>
            ) : (
              <>
                <Button onClick={check} className="min-w-32">
                  <CheckCheck /> Check
                </Button>
                <Button variant="outline" onClick={hint}>
                  <Lightbulb /> Hint
                </Button>
                <Button variant="outline" onClick={reveal}>
                  <Eye /> Show answer
                </Button>
                <Button variant="ghost" onClick={skip} className="ml-auto">
                  <SkipForward /> Skip
                </Button>
              </>
            )}
          </div>
          <p className="mt-3 hidden flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground sm:flex">
            <span>
              <Kbd>Enter</Kbd> check / next
            </span>
            <span>
              <Kbd>Alt</Kbd>+<Kbd>R</Kbd> replay
            </span>
            <span>
              <Kbd>Alt</Kbd>+<Kbd>S</Kbd> slow
            </span>
            <span>
              <Kbd>Alt</Kbd>+<Kbd>H</Kbd> hint
            </span>
            <span>
              <Kbd>Alt</Kbd>+<Kbd>A</Kbd> answer
            </span>
            <span>
              <Kbd>Alt</Kbd>+<Kbd>←</Kbd>/<Kbd>→</Kbd> prev/next
            </span>
          </p>
        </Card>
      </div>
    </div>
  );
}
