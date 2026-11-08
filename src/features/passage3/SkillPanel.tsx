import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { saveSkillScore, skillProgress, type Skill } from '@/lib/ielts/skills';
import { cn } from '@/lib/utils';

/** One skill: how-to, a run of quick drills (one at a time, explained right after answering), then sets to apply it. */
export function SkillPanel({ skill, applied }: { skill: Skill; applied: ReactNode }) {
  return (
    <div className="space-y-6" key={skill.id}>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-bold">{skill.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{skill.short}</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          {skill.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <Drills skill={skill} />
      <section>
        <h3 className="mb-3 text-sm font-semibold">Bài áp dụng</h3>
        {applied}
      </section>
    </div>
  );
}

function Drills({ skill }: { skill: Skill }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const total = skill.drills.length;
  const best = skillProgress()[skill.id];

  if (i >= total) {
    return (
      <section className="rounded-xl border bg-card p-5" data-testid="skill-result">
        <p className="text-sm text-muted-foreground">Luyện nhanh · xong</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {score}/{total} câu đúng
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{score === total ? 'Nắm chắc kỹ năng này. Làm một bài áp dụng bên dưới để giữ tay.' : 'Đọc lại phần giải thích ở các câu sai, rồi thử lại.'}</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => {
            setI(0);
            setPicked(null);
            setScore(0);
          }}
        >
          <RotateCcw /> Làm lại
        </Button>
      </section>
    );
  }

  const d = skill.drills[i]!;
  const answered = picked !== null;
  const right = picked === d.answer;
  const choose = (k: number) => {
    if (answered) return;
    setPicked(k);
    if (k === d.answer) setScore((n) => n + 1);
  };
  const next = () => {
    const n = i + 1;
    if (n >= total) saveSkillScore(skill.id, score, total);
    setI(n);
    setPicked(null);
  };

  return (
    <section className="rounded-xl border bg-card p-5" aria-label="Luyện nhanh" data-testid="skill-drill">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold">Luyện nhanh</p>
        <div className="h-1.5 flex-1 rounded-full bg-muted" role="progressbar" aria-valuenow={i} aria-valuemin={0} aria-valuemax={total} aria-label="Tiến độ luyện nhanh">
          <div className="h-1.5 rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(i / total) * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {i + 1}/{total}
          {best && ` · tốt nhất ${best.best}/${best.total}`}
        </span>
      </div>

      {d.passage && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Trong bài</p>
          <p className="rounded-lg bg-muted p-3 font-serif text-[15px] leading-relaxed" lang="en">
            {d.passage}
          </p>
        </div>
      )}
      {d.stmt && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{d.passage ? 'Câu hỏi' : 'Câu'}</p>
          <p className="rounded-lg border p-3 text-[15px] font-medium leading-relaxed" lang="en">
            {d.stmt}
          </p>
        </div>
      )}

      <p className="mt-4 text-sm font-semibold">{d.ask}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={d.ask}>
        {d.options.map((o, k) => {
          const isAns = k === d.answer;
          const isPick = k === picked;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={isPick}
              disabled={answered}
              onClick={() => choose(k)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                !answered && 'hover:border-primary/50 hover:bg-accent',
                answered && isAns && 'border-success bg-success/10 font-medium',
                answered && isPick && !isAns && 'border-destructive bg-destructive/10',
                answered && !isAns && !isPick && 'opacity-60',
              )}
            >
              {answered && isAns && <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />}
              {answered && isPick && !isAns && <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />}
              <span>{o}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 flex flex-wrap items-start gap-3" aria-live="polite">
          <p className={cn('min-w-0 flex-1 rounded-lg p-3 text-sm leading-relaxed', right ? 'bg-success/10' : 'bg-muted')}>
            <b>{right ? 'Đúng. ' : 'Chưa đúng. '}</b>
            {d.why}
          </p>
          <Button onClick={next} data-next>
            {i + 1 < total ? 'Câu tiếp' : 'Xem kết quả'}
          </Button>
        </div>
      )}
    </section>
  );
}
