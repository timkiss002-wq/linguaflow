import { ArrowLeft, Languages, PenLine, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GuidedRunner, type RunnerItem } from '@/features/writing/guided/GuidedRunner';
import { TaskChart } from '@/features/writing/guided/TaskChart';
import { readSession, sessionKey, writeSession, type GuidedSession } from '@/features/writing/guided/session';
import { useSaveSubmission, useWritingTasks } from '@/features/writing/api';
import { toUserMessage } from '@/lib/errors';
import { analyze } from '@/lib/writing/analyze';
import {
  BANDS,
  LEVELS,
  LEVEL_INFO,
  TASK_RULES,
  assembleEssay,
  countWords,
  guidedPrompt,
  guidedType,
  isBand,
  modelEssay,
  paragraphLabel,
  promptWithData,
  slotOf,
  type Band,
  type GuidedPrompt,
  type GuidedRecord,
  type GuidedType,
  type Level,
} from '@/lib/writing/guided';
import { cn } from '@/lib/utils';

const BAND_INFO: Record<Band, string> = {
  '5.5': 'Câu đơn giản, từ vựng thông dụng — dễ nhớ nhất',
  '6.5': 'Mục tiêu: câu phức vừa phải, collocation tự nhiên',
  '7.5': 'Từ vựng chính xác, cấu trúc đa dạng hơn',
};

/** /writing/guided/:promptId (a prompt) or /writing/guided/frame/:typeId (frame drill for one question type). */
export default function GuidedPracticePage() {
  const { promptId, typeId } = useParams();
  const prompt = promptId ? guidedPrompt(promptId) : undefined;
  const type = prompt ? guidedType(prompt.type) : typeId ? guidedType(typeId) : undefined;
  if (!type || (promptId && !prompt))
    return (
      <EmptyState
        icon={PenLine}
        title="Not found"
        action={
          <Button asChild variant="outline">
            <Link to="/writing/guided">IELTS frames</Link>
          </Button>
        }
      />
    );
  return <Practice key={`${promptId ?? typeId}`} type={type} prompt={prompt} />;
}

function Practice({ type, prompt }: { type: GuidedType; prompt?: GuidedPrompt }) {
  const [params, setParams] = useSearchParams();
  const band: Band = isBand(params.get('band')) ? (params.get('band') as Band) : '6.5';
  const rawLevel = Number(params.get('level'));
  const level: Level | null = !prompt ? 0 : params.has('level') && LEVELS.includes(rawLevel as Level) ? (rawLevel as Level) : null;
  const [showVi, setShowVi] = useState(false);
  const [finished, setFinished] = useState<GuidedSession | null>(null);
  const source = prompt ? prompt.id : `frame-${type.id}`;

  const items: RunnerItem[] = useMemo(
    () =>
      prompt
        ? prompt.sentences.map((s) => ({ slot: slotOf(type, s.slot)!, sentence: s }))
        : type.frame.map((slot) => ({ slot })),
    [prompt, type],
  );

  const title = prompt ? prompt.title : `Learn the frame: ${type.name}`;
  const back = (
    <Link to="/writing/guided" className="inline-flex items-center gap-1 hover:underline">
      <ArrowLeft className="size-3.5" aria-hidden /> IELTS frames
    </Link>
  );

  return (
    <>
      <PageHeader
        title={title}
        description={
          <div className="space-y-1">
            {back}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{type.name}</Badge>
              {prompt && level !== null && <Badge variant="accent">Band {band}</Badge>}
              {level !== null && <Badge variant="secondary">Level {level}: {LEVEL_INFO[level].name}</Badge>}
            </div>
          </div>
        }
      />

      {prompt && (
        <Card className="mb-4">
          <CardContent className="space-y-2 pt-5">
            <p className="font-medium" lang="en" data-testid="task-prompt">
              {prompt.prompt}
            </p>
            {prompt.chart && (level === null || finished) && (
              <div className="rounded-md border bg-card p-3">
                <TaskChart chart={prompt.chart} compact />
              </div>
            )}
            <button type="button" onClick={() => setShowVi((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
              <Languages className="size-3.5" aria-hidden /> {showVi ? 'Ẩn' : 'Xem'} đề tiếng Việt và dàn ý
            </button>
            {showVi && (
              <div className="space-y-1 text-sm text-muted-foreground" lang="vi">
                <p>{prompt.prompt_vi}</p>
                <ul className="list-disc pl-5">
                  {prompt.ideas_vi.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {level === null && prompt ? (
        <Setup prompt={prompt} minutes={TASK_RULES[type.task].minutes} band={band} onStart={(b, l) => setParams({ band: b, level: String(l) })} />
      ) : finished ? (
        <Finish
          type={type}
          prompt={prompt}
          items={items}
          band={band}
          level={level ?? 0}
          session={finished}
          storageKey={sessionKey(source, band, level ?? 0)}
          onAgain={(l) => {
            writeSession(sessionKey(source, band, level ?? 0), null);
            setFinished(null);
            setParams(prompt ? { band, level: String(l) } : {});
          }}
        />
      ) : (
        <GuidedRunner
          key={`${band}-${level}`}
          type={type}
          aside={
            prompt?.chart && (
              <Card>
                <CardContent className="pt-4">
                  <TaskChart chart={prompt.chart} compact />
                </CardContent>
              </Card>
            )
          } storageKey={sessionKey(source, band, level ?? 0)} items={items} band={band} level={level ?? 0} onFinish={setFinished} />
      )}
    </>
  );
}

function Setup({ prompt, minutes, band, onStart }: { prompt: GuidedPrompt; minutes: number; band: Band; onStart: (band: Band, level: Level) => void }) {
  const [b, setB] = useState<Band>(band);
  const resumable = LEVELS.filter((l) => l > 0 && readSession(sessionKey(prompt.id, b, l)));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Band mục tiêu</CardTitle>
          <CardDescription>Câu mẫu bạn sẽ dịch theo. Cùng một ý, ba cách viết.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2" role="radiogroup" aria-label="Target band">
          {BANDS.map((x) => (
            <button
              key={x}
              type="button"
              role="radio"
              aria-checked={b === x}
              onClick={() => setB(x)}
              className={cn('rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary', b === x && 'border-primary ring-2 ring-primary/30')}
            >
              <span className="font-semibold">Band {x}</span>
              <span className="block text-sm text-muted-foreground">{BAND_INFO[x]}</span>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">2. Mức gợi ý</CardTitle>
          <CardDescription>Làm lần lượt từ mức 1 đến 3. Khi mức 3 đạt trên 70%, hãy tự viết cả bài.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {([1, 2, 3] as const).map((l) => (
            <Button key={l} variant="outline" className="h-auto flex-col items-start gap-0.5 whitespace-normal py-2.5 text-left" onClick={() => onStart(b, l)} data-level={l}>
              <span className="font-semibold">
                Level {l}: {LEVEL_INFO[l].name}
                {resumable.includes(l) && <span className="ml-2 text-xs font-normal text-primary">(đang làm dở — tiếp tục)</span>}
              </span>
              <span className="text-xs font-normal text-muted-foreground">{LEVEL_INFO[l].vi}</span>
            </Button>
          ))}
          <Button asChild variant="secondary" className="h-auto flex-col items-start gap-0.5 whitespace-normal py-2.5 text-left">
            <Link to={`/writing/new/${prompt.task}?exam=1`}>
              <span className="font-semibold">Level 4: Thi thử {minutes} phút</span>
              <span className="text-xs font-normal text-muted-foreground">Chỉ có đề bài, bấm giờ như đi thi — rồi AI chấm band</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Finish({
  type,
  prompt,
  items,
  band,
  level,
  session,
  storageKey,
  onAgain,
}: {
  type: GuidedType;
  prompt?: GuidedPrompt;
  items: RunnerItem[];
  band: Band;
  level: Level;
  session: GuidedSession;
  storageKey: string;
  onAgain: (level: Level) => void;
}) {
  const navigate = useNavigate();
  const save = useSaveSubmission();
  const tasks = useWritingTasks();
  const [body, setBody] = useState(() => assembleEssay(items.map((it) => ({ p: it.slot.p, text: session.answers[it.slot.id] ?? '' }))));
  const [modelBand, setModelBand] = useState<Band>(band);
  const [busy, setBusy] = useState(false);

  const results = items.map((it) => session.results[it.slot.id]);
  const accuracy = Math.round(results.reduce((n, r) => n + (r?.accuracy ?? 0), 0) / items.length);
  const frameOk = results.filter((r) => r?.frameOk).length;
  const words = countWords(body);
  const nextLevel = (Math.min(3, level + 1) as Level);
  const minWords = TASK_RULES[type.task].words;

  const submit = async () => {
    if (!prompt || !body.trim()) return;
    setBusy(true);
    try {
      const task = tasks.data?.find((t) => t.id === prompt.task);
      const metrics = analyze(body, { language: 'en', kind: 'essay', minLength: task?.min_length ?? minWords, targets: [], seconds: session.seconds });
      const guided: GuidedRecord = { prompt: prompt.id, band, level, accuracy, frameOk, sentences: items.length };
      const id = await save.mutateAsync({
        language: 'en',
        taskId: prompt.task,
        title: `${task?.title ?? prompt.title} — guided, band ${band}, level ${level}`,
        prompt: promptWithData(prompt),
        targets: [],
        body: body.trim(),
        metrics: { ...metrics, guided },
        seconds: session.seconds,
      });
      writeSession(storageKey, null);
      navigate(`/writing/${id}`);
    } catch (e) {
      toast.error(toUserMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="guided-finish">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={level === 0 ? 'Câu đúng khung' : 'Độ giống câu mẫu (trung bình)'} value={level === 0 ? `${frameOk}/${items.length}` : `${accuracy}%`} />
        <Stat label="Câu có đủ khung" value={`${frameOk}/${items.length}`} />
        <Stat label="Số từ" value={String(words)} hint={words >= minWords ? `đủ ${minWords} từ` : `Task ${type.task} cần ít nhất ${minWords} từ`} />
      </div>

      {level === 0 ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="font-medium">{frameOk === items.length ? 'Bạn đã thuộc khung này!' : 'Ôn lại những câu chưa đúng rồi làm lại nhé.'}</p>
            <ol className="space-y-1 text-sm" lang="en">
              {type.frame.map((s) => (
                <li key={s.id} className={cn(session.results[s.id]?.frameOk ? 'text-success' : 'text-destructive')}>
                  {session.results[s.id]?.frameOk ? '✓' : '✗'} {s.t}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onAgain(0)}>Làm lại</Button>
              <Button asChild variant="outline">
                <Link to="/writing/guided">Chọn đề để luyện</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bài của bạn</CardTitle>
              <CardDescription>Sửa lại nếu muốn, rồi lưu để xem phân tích và nhờ AI chấm band.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="guided-essay" className="sr-only">
                Your essay
              </label>
              <textarea
                id="guided-essay"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                lang="en"
                className="w-full rounded-md border bg-card p-3 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={submit} disabled={busy || !body.trim()}>
                  <Save className="size-4" /> {busy ? 'Saving…' : 'Save & analyse'}
                </Button>
                {level < 3 && (
                  <Button variant="outline" onClick={() => onAgain(nextLevel)}>
                    Lên Level {nextLevel}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => onAgain(level)}>
                  Làm lại level này
                </Button>
              </div>
            </CardContent>
          </Card>
          {prompt && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bài mẫu</CardTitle>
                <div className="flex gap-1.5" role="tablist" aria-label="Model band">
                  {BANDS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      role="tab"
                      aria-selected={modelBand === b}
                      onClick={() => setModelBand(b)}
                      className={cn('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-border', modelBand === b ? 'bg-rose-600 text-white ring-rose-600' : 'text-muted-foreground hover:text-foreground')}
                    >
                      Band {b}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed" lang="en" data-testid="model-essay">
                {modelEssay(prompt, modelBand)
                  .split('\n\n')
                  .map((p, i) => (
                    <div key={i}>
                      <p className="mb-0.5 text-xs font-medium text-muted-foreground">{paragraphLabel(type, i + 1)}</p>
                      <p>{p}</p>
                    </div>
                  ))}
                <p className="text-xs text-muted-foreground">{countWords(modelEssay(prompt, modelBand))} words</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
