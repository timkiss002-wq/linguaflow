import { Eraser, Highlighter, StickyNote } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextSize } from '@/features/exam/prefs';
import type { TestPart } from '@/lib/ielts/tests';
import { cn } from '@/lib/utils';
import { addHighlight, evidenceRanges, noteKey, removeHighlight, segment, type Highlight } from './highlights';

export type { TextSize };
const TEXT_SIZE: Record<TextSize, string> = {
  sm: 'text-[15px] leading-[1.8]',
  md: 'text-[17px] leading-[1.85]',
  lg: 'text-[19px] leading-[1.9]',
};

interface Props {
  part: TestPart;
  highlights: Highlight[];
  onChange: (h: Highlight[]) => void;
  size: TextSize;
  /** notes on highlights (right-click a highlight to write one) */
  notes?: Record<string, string>;
  onNote?: (key: string, text: string) => void;
  /** after marking: where each answer is in the text */
  evidence?: { marks: { n: number; quote: string }[]; active: number | null };
}

const WORD = /[\p{L}\p{N}'’-]/u;
/** Grow a selection to whole words and drop surrounding spaces, so a sloppy drag still highlights clean words. */
function snapToWords(text: string, start: number, end: number): [number, number] {
  while (start < end && /\s/.test(text[start]!)) start++;
  while (end > start && /\s/.test(text[end - 1]!)) end--;
  while (start > 0 && WORD.test(text[start - 1]!) && WORD.test(text[start]!)) start--;
  while (end < text.length && WORD.test(text[end]!) && WORD.test(text[end - 1]!)) end++;
  return [start, end];
}

interface Pending {
  ranges: Highlight[];
  x: number;
  y: number;
}

/**
 * The reading passage. Select any text to highlight it (like the computer-based IELTS);
 * click a highlight to remove it. Highlights are plain character ranges, so they survive reloads.
 */
export function Passage({ part, highlights, onChange, size, evidence, notes = {}, onNote }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [editing, setEditing] = useState<{ key: string; x: number; y: number; text: string } | null>(null);

  const readSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !box.current) return setPending(null);
    const range = sel.getRangeAt(0);
    if (!box.current.contains(range.commonAncestorContainer)) return setPending(null);
    const ranges: Highlight[] = [];
    box.current.querySelectorAll<HTMLElement>('[data-para]').forEach((el) => {
      if (!range.intersectsNode(el)) return;
      const len = el.textContent?.length ?? 0;
      const offset = (node: Node, off: number) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        r.setEnd(node, off);
        return r.toString().length;
      };
      const text = el.textContent ?? '';
      const [start, end] = snapToWords(text, el.contains(range.startContainer) ? offset(range.startContainer, range.startOffset) : 0, el.contains(range.endContainer) ? offset(range.endContainer, range.endOffset) : len);
      if (end > start) ranges.push({ p: Number(el.dataset.para), start, end });
    });
    if (!ranges.length) return setPending(null);
    const rect = range.getBoundingClientRect();
    setPending({ ranges, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  // keyboard selection (shift + arrows) also opens the toolbar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.shiftKey && readSelection();
    const close = () => (setPending(null), setEditing(null));
    document.addEventListener('keyup', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keyup', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [readSelection]);

  const apply = (mode: 'add' | 'remove') => {
    if (!pending) return;
    onChange(pending.ranges.reduce((list, r) => (mode === 'add' ? addHighlight(list, r) : removeHighlight(list, r)), highlights));
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };
  const covered = pending?.ranges.some((r) => highlights.some((h) => h.p === r.p && h.start < r.end && h.end > r.start));

  return (
    <div ref={box} onMouseUp={() => setTimeout(readSelection, 0)} onTouchEnd={() => setTimeout(readSelection, 0)} className={cn('space-y-5', TEXT_SIZE[size])} data-testid="passage-text">
      {part.paragraphs!.map(([label, text], i) => {
        const segs = segment(
          text!,
          highlights.filter((h) => h.p === i),
          evidence ? evidenceRanges(text!, evidence.marks) : [],
        );
        return (
          <p key={i} className="text-pretty [word-spacing:0.04em]">
            {label && <strong className="mr-2 select-none font-bold text-amber-700 dark:text-amber-300">{label}</strong>}
            <span data-para={i}>
              {segs.map((s) => {
                if (s.evidence !== null)
                  return (
                    <mark
                      key={s.start}
                      id={s.evidenceStart ? `ev-${s.evidence}` : undefined}
                      data-n={s.evidenceStart ? s.evidence : undefined}
                      className={cn(
                        'scroll-mt-24 rounded-sm px-0.5 text-foreground',
                        s.evidenceStart && 'before:mr-0.5 before:align-super before:text-[0.7em] before:font-bold before:text-warning before:content-[attr(data-n)]',
                        evidence?.active === s.evidence ? 'bg-warning/50 ring-2 ring-warning' : 'bg-warning/20',
                        s.user && 'underline decoration-amber-500 decoration-2 underline-offset-4',
                      )}
                    >
                      {s.text}
                    </mark>
                  );
                if (s.user) {
                  const h = highlights.find((x) => x.p === i && x.start <= s.start && x.end >= s.start + s.text.length);
                  const note = h ? notes[noteKey(h)] : undefined;
                  const isLast = h && s.start + s.text.length >= h.end;
                  return (
                    <mark
                      key={s.start}
                      title={note ? `Ghi chú: ${note}\n(Bấm để xem / sửa ghi chú)` :onNote ? 'Bấm để bỏ tô · chuột phải để ghi chú' : 'Bấm để bỏ tô'}
                      onClick={(e) => {
                        if (window.getSelection()?.isCollapsed === false || !h) return;
                        // a highlight with a note opens the note, so one stray click can't lose it
                        if (note && onNote) return setEditing({ key: noteKey(h), x: e.clientX, y: e.clientY, text: note });
                        onChange(removeHighlight(highlights, h));
                      }}
                      onContextMenu={(e) => {
                        if (!h || !onNote) return;
                        e.preventDefault();
                        setPending(null);
                        setEditing({ key: noteKey(h), x: e.clientX, y: e.clientY, text: note ?? '' });
                      }}
                      className={cn('cursor-pointer rounded-sm bg-yellow-200 text-foreground hover:bg-yellow-300 dark:bg-yellow-400/40', note && 'underline decoration-sky-600 decoration-dotted decoration-2 underline-offset-4')}
                      data-note={note ? 'true' : undefined}
                    >
                      {s.text}
                      {note && isLast && <StickyNote className="ml-0.5 inline size-3.5 align-baseline text-sky-700 dark:text-sky-300" aria-label="Có ghi chú" />}
                    </mark>
                  );
                }
                return <span key={s.start}>{s.text}</span>;
              })}
            </span>
          </p>
        );
      })}

      {pending && (
        <div role="toolbar" aria-label="Tô đoạn đã chọn" className="fixed z-50 flex -translate-x-1/2 -translate-y-full gap-1 rounded-lg border bg-popover p-1 shadow-lg" style={{ left: pending.x, top: pending.y - 8 }} onMouseDown={(e) => e.preventDefault()}>
          <button type="button" onClick={() => apply('add')} className="flex items-center gap-1.5 rounded-md bg-yellow-200 px-2.5 py-1 text-sm font-medium text-yellow-950 hover:bg-yellow-300">
            <Highlighter className="size-4" aria-hidden /> Tô
          </button>
          {covered && (
            <button type="button" onClick={() => apply('remove')} className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm hover:bg-muted">
              <Eraser className="size-4" aria-hidden /> Bỏ tô
            </button>
          )}
        </div>
      )}

      {editing && onNote && (
        <form
          role="dialog"
          aria-label="Ghi chú cho chỗ đã tô"
          className="fixed z-50 w-72 space-y-2 rounded-lg border bg-popover p-2 text-sm text-popover-foreground shadow-lg"
          style={{ left: Math.min(editing.x, window.innerWidth - 300), top: Math.min(editing.y + 8, window.innerHeight - 170) }}
          onSubmit={(e) => {
            e.preventDefault();
            onNote(editing.key, editing.text.trim());
            setEditing(null);
          }}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
        >
          <textarea
            autoFocus
            rows={3}
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ghi chú (Enter để lưu)…"
            className="w-full resize-none rounded-md border bg-card p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="note-input"
          />
          <div className="flex justify-end gap-1">
            {notes[editing.key] && (
              <button type="button" onClick={() => (onNote(editing.key, ''), setEditing(null))} className="mr-auto rounded-md px-2 py-1 text-destructive hover:bg-muted">
                Xoá ghi chú
              </button>
            )}
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-2 py-1 hover:bg-muted">
              Huỷ
            </button>
            <button type="submit" className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground">
              Lưu
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
