import type { CSSProperties } from 'react';
import type { Token } from '@/lib/ielts/passage3';
import { cn } from '@/lib/utils';

export interface TokenLook {
  /** background colour (a pair) */
  bg?: string;
  /** underline colour: where the key says the pair is */
  key?: string;
  /** chosen by the learner, but not where the key is */
  wrong?: boolean;
}

/**
 * The passage as clickable words. Paragraph breaks in the text are kept.
 * Highlighted words get dark text so they stay readable in dark mode.
 */
export function PassageText({ tokens, look, onWord, interactive }: { tokens: Token[]; look: (i: number) => TokenLook; onWord?: (i: number) => void; interactive: boolean }) {
  const paras: { t: Token; i: number }[][] = [[]];
  tokens.forEach((t, i) => {
    if (t.para) paras.push([]);
    paras[paras.length - 1]!.push({ t, i });
  });
  return (
    <div className="space-y-4 font-serif text-[17px] leading-[1.9] sm:text-lg" lang="en">
      {paras.map((p, pi) => (
        <p key={pi}>
          {p.map(({ t, i }) => {
            const l = look(i);
            const style: CSSProperties = {};
            if (l.bg) style.background = l.bg;
            if (l.key) style.boxShadow = `inset 0 -4px 0 ${l.key}`;
            return (
              <span key={i}>
                <span
                  role={interactive ? 'button' : undefined}
                  tabIndex={-1}
                  data-tok={i}
                  onClick={interactive && onWord ? () => onWord(i) : undefined}
                  className={cn(
                    'rounded-[4px] px-[1px] transition-colors',
                    (l.bg || l.key) && 'text-neutral-900',
                    interactive && 'cursor-pointer hover:outline hover:outline-2 hover:outline-dashed hover:outline-primary/50',
                    l.wrong && 'line-through decoration-destructive decoration-2',
                  )}
                  style={style}
                >
                  {t.w}
                </span>{' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
