import { ArrowLeft, Clock } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { clock, isBlinking, type ExamPrefs } from './prefs';

/**
 * The exam room, laid out like the computer-delivered IELTS: the page itself never scrolls.
 *   top bar (48px)    — what you're doing · clock in the middle · settings · submit
 *   body              — fills the rest of the screen; its panes scroll on their own
 *   bottom bar (56px) — question navigator (optional)
 * Fixed over the whole window, so nothing sticky from the app can cover the clock.
 */
export function ExamFrame({
  exit,
  title,
  timer,
  actions,
  footer,
  theme = 'standard',
  children,
}: {
  exit: { to: string; label: string };
  title: ReactNode;
  timer?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  theme?: ExamPrefs['theme'];
  children: ReactNode;
}) {
  // the page behind must not scroll (wheel at the end of a pane would otherwise move it)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-background text-foreground" data-exam-theme={theme} data-testid="exam-frame">
      <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-card px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link to={exit.to} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={exit.label} title={exit.label}>
            <ArrowLeft className="size-4" aria-hidden /> Thoát
          </Link>
          <div className="min-w-0 truncate text-sm font-semibold">{title}</div>
        </div>
        <div className="flex justify-center">{timer}</div>
        <div className="flex items-center justify-end gap-2">{actions}</div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
      {footer && <footer className="flex h-14 shrink-0 items-center gap-2 border-t bg-card px-3">{footer}</footer>}
    </div>
  );
}

/** Countdown (exam) or elapsed time (practice) for the top bar. Blinks at 10 and 5 minutes left. */
export function ExamClock({ seconds, limit, countdown, blink }: { seconds: number; limit: number; countdown: boolean; blink: boolean }) {
  const left = limit - seconds;
  const warn = countdown && left < 600;
  const danger = countdown && left < 300;
  return (
    <span
      role="timer"
      aria-label={countdown ? `Còn ${Math.ceil(left / 60)} phút` : `Đã làm ${Math.floor(seconds / 60)} phút`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-base tabular-nums',
        danger ? 'border-destructive text-destructive' : warn ? 'border-warning text-warning' : '',
        countdown && blink && isBlinking(left) && 'animate-pulse bg-destructive text-destructive-foreground',
      )}
      data-testid="timer"
    >
      <Clock className="size-4" aria-hidden /> {countdown ? clock(left) : clock(seconds)}
      {countdown && <span className="sr-only"> còn lại</span>}
    </span>
  );
}

/**
 * Two panes side by side that scroll on their own, with a divider you can drag (or move with ← →) to resize.
 * Width is a % of the frame, kept in the exam settings.
 */
export function SplitPane({ left, right, split, onSplit, leftLabel, rightLabel }: { left: ReactNode; right: ReactNode; split: number; onSplit: (pct: number) => void; leftLabel: string; rightLabel: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const clamp = (v: number) => Math.min(75, Math.max(25, Math.round(v)));

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const r = box.current?.getBoundingClientRect();
      if (r) onSplit(clamp(((e.clientX - r.left) / r.width) * 100));
    };
    const up = () => setDrag(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, onSplit]);

  return (
    <div ref={box} className={cn('flex h-full min-h-0', drag && 'cursor-col-resize select-none')}>
      <section aria-label={leftLabel} className="h-full min-w-0 overflow-y-auto overscroll-contain" style={{ width: `${split}%` }} data-pane="left">
        {left}
      </section>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để đổi độ rộng hai cột"
        aria-valuemin={25}
        aria-valuemax={75}
        aria-valuenow={split}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDoubleClick={() => onSplit(50)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          onSplit(clamp(split + (e.key === 'ArrowLeft' ? -2 : 2)));
        }}
        className="group relative w-2 shrink-0 cursor-col-resize bg-border/60 outline-none hover:bg-primary/30 focus-visible:bg-primary/40"
        title="Kéo để đổi độ rộng · bấm đúp để chia đều"
      >
        <span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40 group-hover:bg-primary" aria-hidden />
      </div>
      <section aria-label={rightLabel} className="h-full min-w-0 flex-1 overflow-y-auto overscroll-contain" data-pane="right">
        {right}
      </section>
    </div>
  );
}
