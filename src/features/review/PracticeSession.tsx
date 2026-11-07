import { ArrowRight, CheckCircle2, Clock, RotateCcw, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SpeechErrorNotice } from '@/features/audio/SpeechErrorNotice';
import { useSpeech } from '@/features/audio/useSpeech';
import { useStudySession } from '@/features/dictation/api';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import type { VocabWord } from '@/features/vocabulary/api';
import { useWordFamilies, useWordFamilyIndex } from '@/features/wordforms/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/errors';
import { formatDuration } from '@/lib/format';
import { schedule, type Rating, type SrsMode } from '@/lib/srs/sm2';
import { cn } from '@/lib/utils';
import { useRecordReview } from './api';
import { STEPS, STEP_LABEL, buildCards, hasStep, markGap, markWord, ratingFor, type Mark, type PracticeCard, type Step } from './practice';

const BATCH = 10;

const RATING_VI: Record<Rating, { label: string; className: string }> = {
  again: { label: 'Ôn lại sau 10 phút', className: 'text-destructive' },
  hard: { label: 'Khó — gặp lại sớm', className: 'text-warning' },
  good: { label: 'Nhớ', className: 'text-success' },
  easy: { label: 'Rất chắc', className: 'text-primary' },
};

interface Answered {
  mark: Mark;
  note: string | null;
  /** MCQ: index picked */
  picked?: number;
}

/**
 * Review by using each word: three rounds over a batch of up to 10 cards —
 * choose the meaning, fill the gap with the right word form, translate back to the word.
 * When a batch is done, each card is scheduled from its mistakes (no self-grading).
 */
export function PracticeSession(props: { language: 'en' | 'zh'; queue: VocabWord[]; all: VocabWord[]; mode: SrsMode; onDone: () => void }) {
  const families = useWordFamilies();
  const index = useWordFamilyIndex();
  // Built once, when the word families are in (or failed to load): options must not reshuffle mid-session.
  const [cards, setCards] = useState<PracticeCard[] | null>(null);
  useEffect(() => {
    if (!cards && !families.isPending) setCards(buildCards(props.queue, props.all, index));
  }, [cards, families.isPending, index, props.queue, props.all]);
  if (!cards) return <Skeleton className="mx-auto h-96 max-w-2xl" />;
  return <Session {...props} cards={cards} />;
}

function Session({ language, cards, mode, onDone }: { language: 'en' | 'zh'; cards: PracticeCard[]; mode: SrsMode; onDone: () => void }) {
  const index = useWordFamilyIndex();
  const [batch, setBatch] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [pos, setPos] = useState(0);
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState<{ word: VocabWord; rating: Rating }[]>([]);
  const record = useRecordReview();
  const speech = useSpeech(language);
  const { activeSeconds } = useStudySession(language, null, 'review');
  const input = useRef<HTMLInputElement>(null);
  const lang = language === 'zh' ? 'zh' : 'en';

  const batchCards = cards.slice(batch * BATCH, (batch + 1) * BATCH);
  /** the rounds this batch has, each with the cards that can be practised that way */
  const rounds = STEPS.map((s) => ({ step: s, cards: batchCards.filter((c) => hasStep(c, s)) })).filter((r) => r.cards.length);
  const flipOnly = batchCards.filter((c) => !STEPS.some((s) => hasStep(c, s)));
  const allRounds: { step: Step | 'flip'; cards: PracticeCard[] }[] = [...rounds, ...(flipOnly.length ? [{ step: 'flip' as const, cards: flipOnly }] : [])];
  const round = allRounds[stepIdx];
  const card = round?.cards[pos];
  const finished = batch * BATCH >= cards.length;
  const totalSteps = cards.reduce((n, c) => n + Math.max(1, STEPS.filter((s) => hasStep(c, s)).length), 0);
  const doneSteps = Object.values(marks).reduce((n, m) => n + m.length, 0);

  useEffect(() => {
    if (round?.step === 'mcq' && card) void speech.play(`p:${card.word.id}`, card.word.term, 0.9);
    if (round?.step === 'gap' || round?.step === 'translate') setTimeout(() => input.current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, pos, batch]);

  const answer = (a: Answered) => {
    if (!card || answered) return;
    setAnswered(a);
    setMarks((m) => ({ ...m, [card.word.id]: [...(m[card.word.id] ?? []), a.mark] }));
    if (round?.step !== 'mcq') void speech.play(`p2:${card.word.id}`, round?.step === 'gap' ? card.gap!.answer : card.word.term, 0.9);
  };

  const finishBatch = () => {
    const rated = batchCards.map((c) => {
      const rating = ratingFor(marks[c.word.id] ?? ['wrong'], c.word);
      const next = schedule(c.word, rating, mode);
      record.mutate({ word: c.word, rating, next, durationMs: 20_000 }, { onError: (e) => toast.error(`Chưa lưu được: ${toUserMessage(e)}`) });
      return { word: c.word, rating };
    });
    setResults((r) => [...r, ...rated]);
    setBatch((b) => b + 1);
    setStepIdx(0);
    setPos(0);
  };

  const next = () => {
    setAnswered(null);
    setTyped('');
    if (round && pos + 1 < round.cards.length) return setPos(pos + 1);
    if (stepIdx + 1 < allRounds.length) {
      setStepIdx(stepIdx + 1);
      return setPos(0);
    }
    finishBatch();
  };

  // keys: 1–4 pick an option, Enter goes on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (answered && e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (!answered && round?.step === 'mcq' && card?.mcq && ['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (i < card.mcq.options.length) answer({ mark: i === card.mcq.answer ? 'right' : 'wrong', note: null, picked: i });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished || !round || !card) return <Done results={results} seconds={activeSeconds} onDone={onDone} />;

  const w = card.word;
  const submitTyped = () => {
    if (!typed.trim()) return;
    if (round.step === 'gap') answer(markGap(card.gap!, typed, index, language));
    else answer(markWord(w.term, typed, language));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <ol className="flex items-center gap-1" aria-label="Các bước ôn">
          {STEPS.map((s, i) => {
            const at = round.step === s;
            const past = allRounds.findIndex((r) => r.step === s) < stepIdx;
            return (
              <li key={s} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="size-3 text-muted-foreground" aria-hidden />}
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', at ? 'bg-violet-600 text-white' : past ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-muted text-muted-foreground')} aria-current={at ? 'step' : undefined}>
                  {i + 1}. {STEP_LABEL[s]}
                </span>
              </li>
            );
          })}
        </ol>
        <span className="tabular-nums text-muted-foreground">
          Nhóm {batch + 1}/{Math.ceil(cards.length / BATCH)} · từ {pos + 1}/{round.cards.length}
        </span>
      </div>
      <Progress value={(doneSteps / totalSteps) * 100} label="Tiến độ ôn" />
      {speech.error && <SpeechErrorNotice error={speech.error} language={language} />}

      <Card className="space-y-5 p-6 sm:p-8" data-testid="practice-card" data-step={round.step}>
        {round.step === 'mcq' && card.mcq && (
          <>
            <Prompt label="Chọn nghĩa tiếng Việt">
              <WordHead w={w} lang={lang} onSpeak={() => speech.play(`p3:${w.id}`, w.term, 0.9)} />
            </Prompt>
            <div className="grid gap-2 sm:grid-cols-2">
              {card.mcq.options.map((o, i) => {
                const right = i === card.mcq!.answer;
                const picked = answered?.picked === i;
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={Boolean(answered)}
                    onClick={() => answer({ mark: right ? 'right' : 'wrong', note: null, picked: i })}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-3 text-left transition',
                      !answered && 'hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10',
                      answered && right && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                      answered && picked && !right && 'border-rose-500 bg-rose-50 dark:bg-rose-500/10',
                      answered && !right && !picked && 'opacity-50',
                    )}
                    data-option={i}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">{i + 1}</span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {round.step === 'gap' && card.gap && (
          <Prompt label={card.gap.family ? 'Điền dạng đúng của từ trong ngoặc' : 'Điền từ còn thiếu'}>
            <p className="text-xl leading-relaxed sm:text-2xl" lang={lang}>
              {card.gap.before}
              <span className={cn('mx-1 inline-block min-w-24 border-b-2 px-1 text-center font-semibold', answered ? (answered.mark === 'wrong' ? 'border-rose-500 text-rose-600' : 'border-emerald-500 text-emerald-700 dark:text-emerald-400') : 'border-violet-500 text-violet-700')}>
                {answered ? card.gap.answer : typed || ' '}
              </span>
              <span className="text-violet-700 dark:text-violet-300">({card.gap.base})</span>
              {card.gap.after}
            </p>
          </Prompt>
        )}

        {round.step === 'translate' && (
          <Prompt label={`Dịch sang ${language === 'zh' ? 'tiếng Trung' : 'tiếng Anh'}`}>
            <p className="text-2xl font-semibold sm:text-3xl">{w.meaning_vi}</p>
            <PosBadge pos={w.part_of_speech} />
          </Prompt>
        )}

        {round.step === 'flip' && (
          <Prompt label="Bạn còn nhớ từ này không?">
            <WordHead w={w} lang={lang} onSpeak={() => speech.play(`p4:${w.id}`, w.term, 0.9)} />
            {answered && <p className="text-lg">{w.meaning_vi ?? '—'}</p>}
          </Prompt>
        )}

        {(round.step === 'gap' || round.step === 'translate') && !answered && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitTyped();
            }}
          >
            <Input ref={input} value={typed} onChange={(e) => setTyped(e.target.value)} lang={lang} className="h-12 text-lg" placeholder={round.step === 'gap' ? 'Gõ từ vào chỗ trống…' : 'Gõ từ…'} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} aria-label="Câu trả lời" />
            <Button type="submit" className="h-12" disabled={!typed.trim()}>
              Kiểm tra
            </Button>
          </form>
        )}
        {round.step === 'translate' && !answered && language === 'en' && (
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setTyped(w.term.slice(0, 1))}>
            Gợi ý chữ cái đầu
          </button>
        )}
        {round.step === 'flip' && !answered && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => answer({ mark: 'wrong', note: null })}>
              Quên rồi
            </Button>
            <Button onClick={() => answer({ mark: 'right', note: null })}>Nhớ</Button>
          </div>
        )}

        {answered && round.step !== 'flip' && <Feedback answered={answered} card={card} step={round.step} typed={typed} lang={lang} />}
        {answered && (
          <div className="flex justify-end">
            <Button onClick={next} autoFocus>
              Tiếp <span className="text-xs opacity-75">(Enter)</span> <ArrowRight />
            </Button>
          </div>
        )}
      </Card>
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Dừng ôn (nhóm đang làm chưa được lưu)
        </Button>
      </div>
    </div>
  );
}

function Prompt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function WordHead({ w, lang, onSpeak }: { w: VocabWord; lang: string; onSpeak: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <p className={cn('font-bold', lang === 'zh' ? 'text-5xl' : 'text-4xl')} lang={lang}>
          {w.term}
        </p>
        <Button variant="ghost" size="icon" onClick={onSpeak} aria-label={`Nghe ${w.term}`}>
          <Volume2 />
        </Button>
      </div>
      {w.reading && <p className="text-muted-foreground">{w.reading}</p>}
      <PosBadge pos={w.part_of_speech} />
    </div>
  );
}

function Feedback({ answered, card, step, typed, lang }: { answered: Answered; card: PracticeCard; step: Step; typed: string; lang: string }) {
  const w = card.word;
  const good = answered.mark !== 'wrong';
  return (
    <div className={cn('space-y-1.5 rounded-xl border p-4 text-sm', good ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10')} role="status" data-mark={answered.mark}>
      <p className="flex items-center gap-1.5 font-semibold">
        {good ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <X className="size-4 text-rose-600" aria-hidden />}
        {answered.mark === 'right' ? 'Đúng!' : answered.mark === 'close' ? 'Gần đúng — sai chính tả' : 'Chưa đúng'}
        {answered.note && answered.mark === 'wrong' && <span className="font-normal">· {answered.note}</span>}
      </p>
      {step !== 'mcq' && answered.mark !== 'right' && (
        <p lang={lang}>
          Bạn gõ: <del className="text-rose-700 dark:text-rose-300">{typed}</del> → đáp án: <b>{step === 'gap' ? card.gap!.answer : w.term}</b>
        </p>
      )}
      <p>
        <b lang={lang}>{w.term}</b> = {w.meaning_vi ?? '—'}
      </p>
      {step === 'gap' && card.gap?.why && <p className="text-muted-foreground">Vì sao: {card.gap.why}</p>}
      {step === 'gap' && card.gap?.family && (
        <p className="text-muted-foreground" lang={lang}>
          Họ từ: {card.gap.family.members.map((m) => `${m.word} (${m.pos})`).join(' · ')}
        </p>
      )}
      {step !== 'gap' && w.context_sentence && (
        <p className="text-muted-foreground" lang={lang}>
          “{w.context_sentence}”
        </p>
      )}
    </div>
  );
}

function Done({ results, seconds, onDone }: { results: { word: VocabWord; rating: Rating }[]; seconds: number; onDone: () => void }) {
  const remembered = results.filter((r) => r.rating === 'good' || r.rating === 'easy').length;
  return (
    <div className="mx-auto max-w-xl space-y-5 text-center">
      <CheckCircle2 className="mx-auto size-10 text-success" />
      <div>
        <h2 className="text-2xl font-semibold">Ôn xong {results.length} từ</h2>
        <p className="text-muted-foreground">
          {remembered} từ nhớ chắc · <Clock className="inline size-3.5" /> {formatDuration(seconds)}
        </p>
      </div>
      {results.length > 0 && (
        <Card className="divide-y p-0 text-left">
          {results.map((r) => (
            <div key={r.word.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span>
                <b>{r.word.term}</b> <span className="text-muted-foreground">— {r.word.meaning_vi}</span>
              </span>
              <span className={cn('shrink-0 text-xs font-medium', RATING_VI[r.rating].className)}>{RATING_VI[r.rating].label}</span>
            </div>
          ))}
        </Card>
      )}
      <Button onClick={onDone}>
        <RotateCcw /> Về trang ôn tập
      </Button>
    </div>
  );
}
