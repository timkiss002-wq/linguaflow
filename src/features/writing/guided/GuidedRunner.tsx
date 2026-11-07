import { ArrowRight, Check, Eye, Lightbulb, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiffView } from '@/features/dictation/DiffView';
import {
  BANDS,
  assembleEssay,
  blankTemplate,
  checkFrameOnly,
  checkSentence,
  hintWords,
  paragraphLabel,
  templateParts,
  type Band,
  type FrameCheck,
  type FrameSlot,
  type GuidedSentence,
  type GuidedType,
  type Level,
  type SentenceCheck,
} from '@/lib/writing/guided';
import { cn } from '@/lib/utils';
import { emptySession, readSession, writeSession, type GuidedSession } from './session';

export interface RunnerItem {
  slot: FrameSlot;
  /** absent in the frame drill (level 0 of a question type) */
  sentence?: GuidedSentence;
}

type Checked = { kind: 'sentence'; r: SentenceCheck } | { kind: 'frame'; frame: FrameCheck[]; ok: boolean } | { kind: 'shown' };

const VERDICT: Record<SentenceCheck['verdict'], { title: string; text: string; tone: string }> = {
  great: { title: 'Rất tốt!', text: 'Đúng khung và rất gần câu mẫu.', tone: 'border-success/40 bg-success/10 text-success' },
  good: { title: 'Gần đúng', text: 'Đúng khung, ý gần đúng — so với câu mẫu bên dưới để sửa những chỗ được đánh dấu.', tone: 'border-primary/30 bg-primary/5 text-primary' },
  different: {
    title: 'Khác câu mẫu khá nhiều',
    text: 'Đúng khung, nhưng cách diễn đạt khác câu mẫu. Nếu câu của bạn đúng ngữ pháp và đủ ý thì vẫn được — hãy tự so sánh.',
    tone: 'border-warning/40 bg-warning/10 text-warning',
  },
  frame: { title: 'Thiếu khung', text: 'Câu chưa có cụm cố định của khung — đây là phần phải thuộc lòng.', tone: 'border-destructive/30 bg-destructive/5 text-destructive' },
};

export function GuidedRunner({
  storageKey,
  items,
  band,
  level,
  onFinish,
  type,
  aside,
}: {
  /** shown at the top of the side column (Task 1: the figure, so it stays in view while writing) */
  aside?: React.ReactNode;
  /** the question type, for the paragraph names (Task 1: overview / details) */
  type?: GuidedType;
  storageKey: string;
  items: RunnerItem[];
  band: Band;
  level: Level;
  onFinish: (session: GuidedSession) => void;
}) {
  const initial = useMemo(() => readSession(storageKey) ?? emptySession(), [storageKey]);
  const [session, setSession] = useState<GuidedSession>(initial);
  const index = Math.min(session.index, items.length - 1);
  const item = items[index]!;
  const [text, setText] = useState(initial.answers[item.slot.id] ?? '');
  const [checked, setChecked] = useState<Checked | null>(null);
  const [checkedText, setCheckedText] = useState('');
  const [otherBands, setOtherBands] = useState(false);
  const seconds = useRef(initial.seconds);
  const started = useRef(Object.keys(initial.answers).length > 0);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (started.current && document.visibilityState === 'visible') seconds.current += 1;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    writeSession(storageKey, { ...session, seconds: seconds.current });
  }, [session, storageKey]);

  useEffect(() => {
    input.current?.focus();
  }, [index]);

  const save = (patch: (s: GuidedSession) => GuidedSession) => setSession((s) => patch({ ...s, seconds: seconds.current }));

  const check = () => {
    const answer = text.trim();
    if (!answer) return;
    if (level === 0 || !item.sentence) {
      const r = checkFrameOnly(answer, item.slot);
      setChecked({ kind: 'frame', ...r });
      save((s) => ({ ...s, answers: { ...s.answers, [item.slot.id]: answer }, results: { ...s.results, [item.slot.id]: { accuracy: r.ok ? 100 : 0, frameOk: r.ok, verdict: r.ok ? 'great' : 'frame' } } }));
    } else {
      const r = checkSentence(answer, item.sentence, item.slot, band);
      setChecked({ kind: 'sentence', r });
      save((s) => ({ ...s, answers: { ...s.answers, [item.slot.id]: answer }, results: { ...s.results, [item.slot.id]: { accuracy: r.accuracy, frameOk: r.frameOk, verdict: r.verdict } } }));
    }
    setCheckedText(answer);
  };

  const showModel = () => {
    setChecked({ kind: 'shown' });
    save((s) => ({ ...s, results: { ...s.results, [item.slot.id]: s.results[item.slot.id] ?? { accuracy: 0, frameOk: false, verdict: 'shown' } } }));
  };

  const next = () => {
    const last = index >= items.length - 1;
    const answers = { ...session.answers, [item.slot.id]: text.trim() || session.answers[item.slot.id] || '' };
    const done: GuidedSession = { ...session, answers, index: last ? index : index + 1, seconds: seconds.current };
    setSession(done);
    setChecked(null);
    setCheckedText('');
    setOtherBands(false);
    if (last) {
      onFinish(done);
      return;
    }
    const nextItem = items[index + 1]!;
    setText(done.answers[nextItem.slot.id] ?? '');
  };

  const back = () => {
    if (index === 0) return;
    const prev = items[index - 1]!;
    setSession((s) => ({ ...s, index: index - 1 }));
    setText(session.answers[prev.slot.id] ?? '');
    setChecked(null);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (checked && text.trim() === checkedText) next();
    else check();
  };

  const essaySoFar = assembleEssay(items.map((it) => ({ p: it.slot.p, text: it.slot.id === item.slot.id ? text : session.answers[it.slot.id] ?? '' })));
  const para = paragraphLabel(type, item.slot.p);
  const model = item.sentence?.en[band];
  const hints = level === 1 && model ? hintWords(model, item.slot) : [];
  const done = Object.keys(session.results).length;

  return (
    <div className={cn('grid gap-4', aside ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_20rem]')}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums" data-testid="position">
            Câu {index + 1}/{items.length}
          </span>
          <span>·</span>
          <span>
            {para}
          </span>
        </div>
        <Progress value={(done / items.length) * 100} label="Sentences done" />

        <Card>
          <CardContent className="space-y-4 pt-5">
            {level <= 2 && (
              <p className="text-sm">
                <span className="font-medium">{item.slot.role_vi}</span> <span className="text-muted-foreground">· {item.slot.role}</span>
              </p>
            )}
            {item.sentence && level >= 1 && (
              <p className="text-lg leading-relaxed" lang="vi" data-testid="vi">
                {item.sentence.vi}
              </p>
            )}
            {level === 1 && (
              <p className="rounded-md bg-muted/60 px-3 py-2 font-mono text-[15px]" data-testid="template">
                {templateParts(item.slot).map((p, i) =>
                  p.fixed ? (
                    <strong key={i} className="text-rose-700 dark:text-rose-300">
                      {p.text}
                    </strong>
                  ) : (
                    <span key={i}>{p.text}</span>
                  ),
                )}
              </p>
            )}
            {level === 0 && (
              <p className="rounded-md bg-muted/60 px-3 py-2 font-mono text-[15px]" data-testid="template">
                {blankTemplate(item.slot)}
              </p>
            )}
            {hints.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-sm">
                <Lightbulb className="size-4 text-warning" aria-hidden />
                <span className="text-muted-foreground">Từ gợi ý:</span>
                {hints.map((w) => (
                  <Badge key={w} variant="outline" className="font-normal" lang="en">
                    {w}
                  </Badge>
                ))}
              </p>
            )}

            <div>
              <label htmlFor="guided-answer" className="mb-1 block text-xs text-muted-foreground">
                {level === 0 ? 'Gõ lại cả câu khung (chỗ ___ để trống hoặc viết gì cũng được)' : 'Câu tiếng Anh của bạn'}
              </label>
              <textarea
                id="guided-answer"
                ref={input}
                value={text}
                rows={3}
                lang="en"
                spellCheck={false}
                autoComplete="off"
                onKeyDown={onKey}
                onChange={(e) => {
                  started.current = true;
                  setText(e.target.value);
                }}
                className="w-full rounded-md border bg-card p-3 text-[17px] leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={level === 0 ? item.slot.role : 'Type the sentence in English…'}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={check} disabled={!text.trim() || (checked !== null && text.trim() === checkedText)}>
                <Check className="size-4" /> Check
              </Button>
              {checked ? (
                <Button variant="secondary" onClick={next}>
                  {index >= items.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button variant="ghost" onClick={showModel}>
                  <Eye className="size-4" /> {level === 0 ? 'Show the frame' : 'Show model'}
                </Button>
              )}
              {index > 0 && (
                <Button variant="ghost" size="sm" onClick={back} className="ml-auto">
                  ← Previous
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Enter: kiểm tra · Enter lần nữa: câu tiếp theo · sửa câu rồi Enter để kiểm tra lại.</p>
          </CardContent>
        </Card>

        {checked && (
          <Card data-testid="feedback">
            <CardContent className="space-y-4 pt-5">
              {checked.kind === 'frame' && (
                <div className={cn('rounded-md border px-3 py-2', checked.ok ? VERDICT.great.tone : VERDICT.frame.tone)}>
                  <p className="font-semibold">{checked.ok ? 'Đúng khung!' : 'Chưa đúng khung'}</p>
                </div>
              )}
              {checked.kind === 'sentence' && (
                <div className={cn('rounded-md border px-3 py-2', VERDICT[checked.r.verdict].tone)} data-verdict={checked.r.verdict}>
                  <p className="font-semibold">
                    {VERDICT[checked.r.verdict].title}{' '}
                    <span className="text-sm font-normal tabular-nums">
                      · giống câu mẫu band {checked.r.closest} {Math.round(checked.r.accuracy)}%
                    </span>
                  </p>
                  <p className="text-sm text-foreground/80">{VERDICT[checked.r.verdict].text}</p>
                </div>
              )}

              {(checked.kind === 'frame' || checked.kind === 'sentence') && (
                <FrameChecks frame={checked.kind === 'frame' ? checked.frame : checked.r.frame} />
              )}

              {checked.kind === 'sentence' && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Câu của bạn so với câu mẫu band {checked.r.closest}</p>
                  <DiffView result={checked.r.diff} language="en" reveal />
                </div>
              )}
              {checked.kind === 'sentence' && checked.r.missing.length > 0 && (
                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">Từ quan trọng bạn chưa dùng:</span>
                  {checked.r.missing.map((w) => (
                    <Badge key={w} variant="warning" lang="en">
                      {w}
                    </Badge>
                  ))}
                </p>
              )}
              {checked.kind === 'sentence' && checked.r.notes.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {checked.r.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}

              {item.sentence && level > 0 ? (
                <div className="space-y-2 rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Câu mẫu band {band}</p>
                  <p className="text-[17px] leading-relaxed" lang="en" data-testid="model">
                    {model}
                  </p>
                  {otherBands ? (
                    BANDS.filter((b) => b !== band).map((b) => (
                      <p key={b} className="text-sm" lang="en">
                        <span className="mr-1 text-xs font-medium text-muted-foreground">Band {b}:</span>
                        {item.sentence!.en[b]}
                      </p>
                    ))
                  ) : (
                    <button type="button" onClick={() => setOtherBands(true)} className="text-xs text-primary hover:underline">
                      Xem cùng câu ở band khác ({BANDS.filter((b) => b !== band).join(' / ')})
                    </button>
                  )}
                </div>
              ) : (
                <p className="rounded-md bg-muted/50 p-3 font-mono text-[15px]" lang="en">
                  {templateParts(item.slot).map((p, i) => (p.fixed ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
                </p>
              )}
              {checked.kind !== 'shown' && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RotateCcw className="size-3" aria-hidden /> Sửa câu ở trên rồi bấm Check để kiểm tra lại.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-3">
        {aside}
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-sm font-medium">Bài viết của bạn</p>
            {essaySoFar ? (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto text-sm leading-relaxed" lang="en" data-testid="essay-so-far">
                {essaySoFar.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Các câu bạn viết sẽ ghép dần thành bài ở đây.</p>
            )}
          </CardContent>
        </Card>
        {level === 1 && (
          <Card>
            <CardContent className="space-y-1.5 pt-5">
              <p className="text-sm font-medium">Khung bài</p>
              <ol className="space-y-1 text-xs">
                {items.map((it, i) => (
                  <li key={it.slot.id} className={cn('rounded px-1.5 py-0.5', i === index ? 'bg-rose-100 font-medium dark:bg-rose-500/15' : 'text-muted-foreground')}>
                    {it.slot.t}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function FrameChecks({ frame }: { frame: FrameCheck[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Frame phrases">
      {frame.map((f) => (
        <li
          key={f.phrase}
          data-found={f.found}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
            !f.found ? 'border-destructive/40 text-destructive' : f.typo ? 'border-warning/50 text-warning' : 'border-success/40 text-success',
          )}
        >
          {f.found ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
          <span lang="en">{f.phrase}</span>
          {f.typo && <span>(sai chính tả)</span>}
        </li>
      ))}
    </ul>
  );
}
