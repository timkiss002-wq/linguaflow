import { Check, Languages, PenLine } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamEditor } from '@/features/writing/ExamEditor';
import { fetchHskLevels, useSaveSubmission, useWritingProfile, useWritingTasks } from '@/features/writing/api';
import { toUserMessage } from '@/lib/errors';
import { splitWords } from '@/lib/vocab/words';
import { analyze, usesWord, type Lang } from '@/lib/writing/analyze';
import { targetWords, type WritingTask } from '@/lib/writing/tasks';
import { guidedForTask, visiblePrompt } from '@/lib/writing/guided';
import { TaskChart } from '@/features/writing/guided/TaskChart';
import { cn } from '@/lib/utils';

const TIPS: Record<Lang, Record<WritingTask['kind'], string>> = {
  en: {
    sentences: 'One full sentence for each word.',
    paragraph: 'Topic sentence → 2–3 supporting sentences with details → a closing sentence.',
    letter: 'Greeting → why you are writing → one paragraph for each point in the task → what you want → closing (Best wishes / Yours sincerely).',
    essay: 'Introduction (rephrase the question + your opinion) → two body paragraphs, one idea each, with an example → conclusion. Leave an empty line between paragraphs.',
  },
  zh: {
    sentences: '每个词写一个完整的句子（主语 + 谓语），用中文标点。',
    paragraph: '开头点题 → 中间写两三个具体的细节 → 结尾写感受或总结。',
    letter: '称呼 → 写信的目的 → 具体内容 → 结尾问候。',
    essay: '开头表明观点 → 分两三点说明理由，每点举例 → 结尾总结。段落之间空一行。',
  },
};

const draftKey = (taskId: string) => `writing-draft:${taskId}`;
function readDraft(taskId: string): { body: string; targets: string[]; seconds: number } | null {
  try {
    const raw = localStorage.getItem(draftKey(taskId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(taskId: string, d: { body: string; targets: string[]; seconds: number } | null) {
  try {
    if (d) localStorage.setItem(draftKey(taskId), JSON.stringify(d));
    else localStorage.removeItem(draftKey(taskId));
  } catch {
    /* private mode: drafts just aren't kept */
  }
}

export default function WritingEditorPage() {
  const { taskId = '' } = useParams();
  const [params] = useSearchParams();
  const tasks = useWritingTasks();
  const task = tasks.data?.find((t) => t.id === taskId);
  if (tasks.isError) return <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />;
  if (!tasks.data) return <Skeleton className="h-96" />;
  if (!task)
    return (
      <EmptyState
        icon={PenLine}
        title="Prompt not found"
        action={
          <Button asChild variant="outline">
            <Link to="/writing">All prompts</Link>
          </Button>
        }
      />
    );
  if (params.get('exam') === '1' && task.exam === 'ielts' && task.kind === 'essay') return <ExamEditor key={task.id} task={task} />;
  return <Editor key={task.id} task={task} />;
}

function Editor({ task }: { task: WritingTask }) {
  const lang = task.language;
  const profile = useWritingProfile(lang);
  const navigate = useNavigate();
  const save = useSaveSubmission();
  const draft = useMemo(() => readDraft(task.id), [task.id]);
  const [body, setBody] = useState(draft?.body ?? '');
  const [showVi, setShowVi] = useState(false);
  const [busy, setBusy] = useState(false);
  // writing time: counted only while the page is open and the learner has started typing
  const seconds = useRef(draft?.seconds ?? 0);
  const started = useRef(Boolean(draft?.body));

  // target words are fixed once (saved with the draft), so they don't change while writing
  const [targets, setTargets] = useState<string[] | null>(draft?.targets ?? null);
  const [fromNotebook, setFromNotebook] = useState<string[]>([]);
  useEffect(() => {
    if (targets || !profile) return;
    const t = targetWords(task, profile.notebook);
    setTargets(t.words);
    setFromNotebook(t.fromNotebook);
  }, [targets, profile, task]);

  useEffect(() => {
    const id = setInterval(() => {
      if (started.current && document.visibilityState === 'visible') seconds.current += 1;
    }, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!targets) return;
    const id = setTimeout(() => writeDraft(task.id, body ? { body, targets, seconds: seconds.current } : null), 400);
    return () => clearTimeout(id);
  }, [body, targets, task.id]);

  const length = lang === 'zh' ? (body.match(/\p{Script=Han}/gu) ?? []).length : splitWords(body, 'en').filter((s) => s.isWord).length;
  const unit = lang === 'zh' ? 'characters' : 'words';

  const submit = async () => {
    if (!targets || !body.trim()) return;
    setBusy(true);
    try {
      const hsk = lang === 'zh' ? await fetchHskLevels(splitWords(body, 'zh').filter((s) => s.isWord).map((s) => s.text)) : undefined;
      const metrics = analyze(body, { language: lang, kind: task.kind, minLength: task.min_length, targets, hsk, level: profile?.level.value, seconds: seconds.current });
      const id = await save.mutateAsync({ language: lang, taskId: task.id, title: task.title, prompt: task.prompt, targets, body: body.trim(), metrics, seconds: seconds.current });
      writeDraft(task.id, null);
      navigate(`/writing/${id}`);
    } catch (e) {
      toast.error(toUserMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          <Link to={`/writing?lang=${lang}`} className="hover:underline">
            ← {lang === 'zh' ? '中文' : 'English'} prompts
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-2 pt-5">
              <p className={cn(lang === 'zh' && 'text-lg')} lang={lang === 'zh' ? 'zh-CN' : 'en'} data-testid="task-prompt">
                {visiblePrompt(task.prompt)}
              </p>
              {guidedForTask(task.id)?.chart && (
                <div className="rounded-md border p-3">
                  <TaskChart chart={guidedForTask(task.id)!.chart!} />
                </div>
              )}
              {task.prompt_vi && (
                <>
                  <button type="button" onClick={() => setShowVi((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                    <Languages className="size-3.5" aria-hidden /> {showVi ? 'Hide' : 'Show'} Vietnamese
                  </button>
                  {showVi && (
                    <p className="text-sm text-muted-foreground" lang="vi">
                      {task.prompt_vi}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <label htmlFor="writing-body" className="sr-only">
            Your text
          </label>
          <textarea
            id="writing-body"
            value={body}
            onChange={(e) => {
              started.current = true;
              setBody(e.target.value);
            }}
            rows={lang === 'zh' ? 10 : 14}
            maxLength={20000}
            lang={lang === 'zh' ? 'zh-CN' : 'en'}
            placeholder={lang === 'zh' ? '在这里写…' : 'Write here…'}
            className={cn('w-full rounded-md border bg-card p-4 leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', lang === 'zh' && 'text-lg')}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={cn('text-sm tabular-nums', length >= task.min_length ? 'text-success' : 'text-muted-foreground')} data-testid="length">
              {length} / {task.min_length}
              {task.max_length ? `–${task.max_length}` : '+'} {unit}
            </p>
            <Button onClick={submit} disabled={busy || !body.trim() || !targets}>
              {busy ? 'Analysing…' : 'Analyse my text'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Your draft is kept on this device until you submit.</p>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardContent className="space-y-2 pt-5">
              <p className="text-sm font-medium">Use these words</p>
              {!targets ? (
                <Skeleton className="h-8" />
              ) : (
                <ul className="flex flex-wrap gap-1.5" data-testid="targets">
                  {targets.map((w) => {
                    const used = usesWord(body, w, lang);
                    return (
                      <li key={w} data-used={used}>
                        <Badge variant={used ? 'default' : 'outline'} className="gap-1 text-sm" lang={lang === 'zh' ? 'zh-CN' : 'en'}>
                          {used && <Check className="size-3" aria-label="used" />}
                          {w}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
              {fromNotebook.length > 0 && <p className="text-xs text-muted-foreground">{fromNotebook.join(', ')} — from your notebook: using them is reviewing them.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 pt-5">
              <p className="text-sm font-medium">How to build it</p>
              <p className="text-sm text-muted-foreground" lang={lang === 'zh' ? 'zh-CN' : 'en'}>
                {TIPS[lang][task.kind]}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
