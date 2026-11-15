import { ArrowLeft, CheckCircle2, Circle, Lock, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { useRoadmapContext } from '@/features/roadmap/useRoadmap';
import { useSaveSubmission } from '@/features/writing/api';
import { toUserMessage } from '@/lib/errors';
import { activeTopicOf, activeWordsOf, dayByDate, formatDay } from '@/lib/roadmap/plan';
import { dayLock, refreshRoadmap } from '@/lib/roadmap/progress';
import { MAX_SENTENCES, MIN_SENTENCES, checkSentences, saveSentences, sentencesOf } from '@/lib/roadmap/sentences';
import { analyze } from '@/lib/writing/analyze';
import { cn } from '@/lib/utils';

/**
 * /viet-cau/:date — the active-vocabulary task of one day: learn 5 Writing collocations, then write 3–5 sentences
 * answering the day's prompt with all 5 of them. Saved in this browser; "Nhờ AI chữa" sends it to the Writing feedback.
 */
export default function SentencesPage() {
  const { date = '' } = useParams();
  const navigate = useNavigate();
  const ctx = useRoadmapContext();
  const day = dayByDate(date);
  const task = day?.tasks.find((t) => t.kind === 'vocab-active');
  const topic = task ? activeTopicOf(task) : undefined;
  const words = useMemo(() => (task ? activeWordsOf(task) : []), [task]);
  const phrases = useMemo(() => words.map((w) => w.t), [words]);
  const saved = sentencesOf(date);
  const [text, setText] = useState(saved?.text ?? '');
  const [manual, setManual] = useState<string[]>(saved?.manual ?? []);
  const [showEx, setShowEx] = useState(true);
  const save = useSaveSubmission();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const s = sentencesOf(date);
    setText(s?.text ?? '');
    setManual(s?.manual ?? []);
  }, [date]);

  const check = useMemo(() => checkSentences(text, phrases, manual), [text, phrases, manual]);

  if (!day || !task || !topic)
    return (
      <EmptyState
        icon={Circle}
        title="Ngày này không có bài viết câu"
        description="Bài viết 3–5 câu có vào thứ Hai – thứ Bảy của giai đoạn Nền tảng và Luyện tập."
        action={
          <Button asChild variant="outline">
            <Link to="/lo-trinh">Xem lộ trình</Link>
          </Button>
        }
      />
    );

  const lock = dayLock(day, ctx);
  const prompt = task.active!.prompt;

  const onSave = () => {
    saveSentences(date, { text, manual, savedAt: new Date().toISOString(), passed: check.passed });
    refreshRoadmap();
    if (check.passed) toast.success('Đã lưu. Bài hôm nay đạt yêu cầu.');
    else toast('Đã lưu bản nháp. Chưa đạt: cần 3–5 câu và dùng đủ 5 cụm.');
  };

  const askAi = async () => {
    onSave();
    setSending(true);
    try {
      const metrics = analyze(text, { language: 'en', kind: 'sentences', minLength: MIN_SENTENCES, targets: phrases });
      const id = await save.mutateAsync({
        language: 'en',
        taskId: `roadmap-sentences-${date}`,
        title: `Viết câu ${formatDay(date)} · ${topic.name}`,
        prompt: `${prompt}\n\nViết 3–5 câu trả lời đề trên, dùng đủ các cụm: ${phrases.join('; ')}.`,
        targets: phrases,
        body: text.trim(),
        metrics,
        seconds: 0,
      });
      navigate(`/writing/${id}?new=1`);
    } catch (e) {
      toast.error(toUserMessage(e));
      setSending(false);
    }
  };

  const toggleManual = (p: string) => setManual((m) => (m.includes(p) ? m.filter((x) => x !== p) : [...m, p]));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to={`/lo-trinh/${date}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden /> {formatDay(date)}
      </Link>
      <header>
        <p className="text-sm font-medium text-muted-foreground">Từ vựng chủ động · {topic.vi}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Học 5 cụm, viết 3–5 câu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mục tiêu: tự dùng được cụm từ trong bài Writing. Câu nào cũng phải trả lời đúng đề, không viết câu rời rạc.</p>
      </header>

      {lock && (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="size-4" aria-hidden /> {lock}
        </p>
      )}

      <section className="rounded-xl border bg-card p-4" aria-labelledby="phrases">
        <div className="flex items-center justify-between gap-2">
          <h2 id="phrases" className="text-sm font-semibold">
            1 · 5 cụm từ hôm nay
          </h2>
          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowEx((v) => !v)}>
            {showEx ? 'Ẩn ví dụ (tự nhớ lại)' : 'Hiện ví dụ'}
          </button>
        </div>
        <ul className="mt-2 divide-y">
          {words.map((w) => (
            <li key={w.t} className="flex items-start gap-3 py-2">
              <button
                type="button"
                onClick={() => toggleManual(w.t)}
                title={check.used[w.t] ? 'Đã dùng' : 'Bấm nếu bạn đã dùng cụm này (dạng chia khác máy chưa nhận ra)'}
                aria-label={check.used[w.t] ? `Đã dùng ${w.t}` : `Chưa dùng ${w.t}`}
                className="mt-0.5 shrink-0"
              >
                {check.used[w.t] ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-border" />}
              </button>
              <div className="min-w-0">
                <p>
                  <span className="font-semibold" lang="en">
                    {w.t}
                  </span>
                  {w.p && <PosBadge pos={w.p} className="ml-1.5" />}
                  <span className="text-muted-foreground"> — {w.m}</span>
                </p>
                {showEx && (
                  <p className="text-sm italic text-muted-foreground" lang="en">
                    {w.ex}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-4" aria-labelledby="prompt">
        <h2 id="prompt" className="text-sm font-semibold">
          2 · Đề Writing hôm nay
        </h2>
        <p className="mt-1.5 rounded-lg bg-muted px-3 py-2 text-[15px]" lang="en">
          {prompt}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Gợi ý: 1 câu nêu quan điểm, 2–3 câu lý do + ví dụ, 1 câu kết. Mỗi câu nên có 1–2 cụm.</p>
        <Textarea
          className="mt-3 min-h-44 text-[15px]"
          lang="en"
          spellCheck={false}
          disabled={Boolean(lock)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết 3–5 câu tiếng Anh ở đây…"
          aria-label="Câu của bạn"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={cn(check.enoughSentences && !check.tooMany ? 'text-success' : 'text-muted-foreground')}>
            {check.sentences.length} câu (cần {MIN_SENTENCES}–{MAX_SENTENCES}){check.tooMany && ' · nhiều quá, gộp hoặc bỏ bớt'}
          </span>
          <span className={cn(check.usedCount === phrases.length ? 'text-success' : 'text-muted-foreground')}>
            Đã dùng {check.usedCount}/{phrases.length} cụm
          </span>
          {saved && <span className="text-xs text-muted-foreground">Lưu lúc {new Date(saved.savedAt).toLocaleString('vi-VN')}</span>}
        </div>
        {!lock && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={!text.trim()}>
              {check.passed ? 'Lưu · hoàn thành' : 'Lưu nháp'}
            </Button>
            <Button variant="outline" onClick={askAi} disabled={!check.passed || sending}>
              <Sparkles /> Nhờ AI chữa
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Máy tự nhận ra cụm từ cả khi bạn chia động từ (rise → rose, increase → increased). Nếu bạn đã dùng mà vòng tròn chưa xanh, bấm vào vòng tròn đó.</p>
      </section>
    </div>
  );
}
