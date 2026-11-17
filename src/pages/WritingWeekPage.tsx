import { CheckCircle2, Circle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PracticeShell } from '@/features/practice/PracticeShell';
import { WriteRunner } from '@/features/practice/WriteRunner';
import { practiceOf } from '@/lib/practice/results';
import type { Task } from '@/lib/roadmap/plan';
import {
  OWN_MIN_TARGETS,
  OWN_MIN_WORDS,
  countWords,
  ownOf,
  paragraphItems,
  saveOwn,
  usedTargets,
  weekCollocations,
  writingTargets,
  writingWeek,
  type WritingWeek,
} from '@/lib/roadmap/writing';
import { cn } from '@/lib/utils';

/**
 * /writing-tuan/:date — the week's Writing: the prompt and every word it needs (collocations, word forms, extra words),
 * the model paragraph translated sentence by sentence (checked on the device), then an own paragraph on a second prompt
 * with a checklist of the week's words it uses. No AI.
 */
export default function WritingWeekPage() {
  const { date = '' } = useParams();
  return (
    <PracticeShell
      date={date}
      kind="writing-week"
      title="Writing tuần"
      intro={
        <>
          Đoạn văn mẫu chỉ dùng cụm từ, word form và từ bổ sung đã học đến tuần này. Dịch từng câu (máy chấm ngay, có gợi ý), rồi tự viết một đoạn cho đề thứ hai.
        </>
      }
      empty="Writing tuần có vào Chủ nhật (giai đoạn 1) hoặc thứ Bảy (giai đoạn 2)."
    >
      {({ day, task, save }) => {
        const w = writingWeek(day.week);
        return w ? <Body key={date} w={w} task={task} save={save} /> : <p className="text-sm text-muted-foreground">Tuần này chưa có bài Writing.</p>;
      }}
    </PracticeShell>
  );
}

function Body({ w, task, save }: { w: WritingWeek; task: Task; save: (score: number, total: number) => void }) {
  const items = useMemo(() => paragraphItems(w), [w]);
  const [step, setStep] = useState<'intro' | 'translate' | 'own'>(practiceOf(task.id) ? 'own' : 'intro');
  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tuần {w.week} · {w.title}
        </p>
        <p className="mt-1 text-[15px] font-medium" lang="en">
          {w.prompt}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{w.prompt_vi}</p>
      </section>

      <WordBank w={w} open={step === 'intro'} />

      {step === 'intro' && (
        <Button onClick={() => setStep('translate')}>Bắt đầu dịch {items.length} câu</Button>
      )}
      {step === 'translate' && (
        <WriteRunner
          items={items}
          mode="translate"
          heading="Đoạn văn mẫu"
          summary={false}
          onFinish={(score, total) => {
            save(score, total);
            setStep('own');
          }}
        />
      )}
      {step === 'own' && (
        <>
          <Model w={w} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('translate')}>
              Dịch lại đoạn mẫu
            </Button>
          </div>
          <Own w={w} taskId={task.id} />
        </>
      )}
    </div>
  );
}

/** Every word the week's writing needs, grouped as in the vocabulary sheet. */
function WordBank({ w, open }: { w: WritingWeek; open: boolean }) {
  const colls = weekCollocations(w);
  return (
    <details className="rounded-xl border bg-card p-4" open={open} data-testid="word-bank">
      <summary className="cursor-pointer text-sm font-semibold">
        Từ cần cho bài này · {colls.length} cụm · {w.forms.length} họ từ · {w.bank.length} từ bổ sung
      </summary>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collocation của tuần</h3>
          <ul className="mt-1 space-y-0.5 text-sm">
            {colls.map((c) => (
              <li key={c.t}>
                <b lang="en">{c.t}</b> — {c.m}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Word form</h3>
          <ul className="mt-1 space-y-0.5 text-sm">
            {w.forms.map((f) => (
              <li key={f.head} lang="en">
                {f.words.map((x) => `${x.w} (${x.pos})`).join(' · ')}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Từ bổ sung · phrasal verb · idiom</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {w.bank.map((b) => (
              <li key={b.term}>
                <span className="rounded bg-muted px-1 text-[11px] text-muted-foreground">{b.type}</span> <b lang="en">{b.term}</b> — {b.m}
                {b.ex && (
                  <span className="block text-xs italic text-muted-foreground" lang="en">
                    {b.ex}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

function Model({ w }: { w: WritingWeek }) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10" data-testid="model">
      <h2 className="text-sm font-semibold">Đoạn văn mẫu</h2>
      <p className="mt-1.5 leading-relaxed" lang="en">
        {w.paragraph.map((s) => s.en[0]).join(' ')}
      </p>
    </section>
  );
}

function Own({ w, taskId }: { w: WritingWeek; taskId: string }) {
  const saved = ownOf(taskId);
  const [text, setText] = useState(saved?.text ?? '');
  const used = useMemo(() => usedTargets(text, w), [text, w]);
  const all = useMemo(() => writingTargets(w), [w]);
  const words = countWords(text);
  const ok = words >= OWN_MIN_WORDS && used.length >= OWN_MIN_TARGETS;
  const usedSet = new Set(used.map((u) => u.term));
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="own">
      <h2 id="own" className="text-sm font-semibold">
        Tự viết một đoạn
      </h2>
      <p className="text-[15px] font-medium" lang="en">
        {w.own}
      </p>
      <p className="text-sm text-muted-foreground">{w.own_vi}</p>
      <Textarea className="min-h-48 text-[15px]" lang="en" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder="Viết đoạn văn tiếng Anh ở đây…" aria-label="Đoạn văn của bạn" />
      <p className="flex flex-wrap gap-x-4 text-sm">
        <span className={cn(words >= OWN_MIN_WORDS ? 'text-success' : 'text-muted-foreground')}>
          {words} từ (cần {OWN_MIN_WORDS}–150)
        </span>
        <span className={cn(used.length >= OWN_MIN_TARGETS ? 'text-success' : 'text-muted-foreground')} data-testid="targets-used">
          Đã dùng {used.length} từ / cụm của tuần (cần ít nhất {OWN_MIN_TARGETS})
        </span>
      </p>
      <Button
        onClick={() => {
          saveOwn(taskId, text);
          toast.success(ok ? 'Đã lưu. Đoạn văn đủ độ dài và dùng đủ từ của tuần.' : 'Đã lưu bản nháp.');
        }}
        disabled={!text.trim()}
      >
        {ok ? 'Lưu · hoàn thành' : 'Lưu nháp'}
      </Button>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Danh sách từ máy kiểm tra ({all.length})</summary>
        <ul className="mt-2 flex flex-wrap gap-1.5" lang="en">
          {all.map((t) => (
            <li key={`${t.kind}:${t.term}`} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', usedSet.has(t.term) && 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10')}>
              {usedSet.has(t.term) ? <CheckCircle2 className="size-3 text-success" aria-hidden /> : <Circle className="size-3 text-border" aria-hidden />}
              {t.term}
            </li>
          ))}
        </ul>
      </details>
      <p className="text-xs text-muted-foreground">Máy chỉ kiểm tra độ dài và từ vựng đã dùng, không chấm ngữ pháp. Đọc lại và so với đoạn văn mẫu ở trên.</p>
    </section>
  );
}
