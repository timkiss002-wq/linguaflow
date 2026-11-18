import { cn } from '@/lib/utils';

/**
 * Decorative drawing for the top of "Hôm nay": a desk with an open book, a cup and a plant, and a speech bubble.
 * Drawn with the theme's colours (so it follows light/dark mode) and kept out of exercise screens on purpose:
 * decoration helps the mood of a hub page but distracts while answering (seductive-details research).
 */
export function StudyScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" className={cn('block', className)} aria-hidden focusable="false">
      {/* soft backdrop */}
      <circle cx="132" cy="78" r="66" className="fill-accent" />
      <circle cx="206" cy="30" r="14" className="fill-warm-soft" />
      <circle cx="34" cy="44" r="8" className="fill-warm-soft" />
      {/* desk */}
      <rect x="22" y="118" width="200" height="8" rx="4" className="fill-primary" opacity="0.85" />
      {/* open book */}
      <path d="M78 116c14-8 30-9 44-3v-46c-14-6-30-5-44 3z" className="fill-card stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M166 116c-14-8-30-9-44-3v-46c14-6 30-5 44 3z" className="fill-card stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M88 82c8-3 17-4 26-1M88 92c8-3 17-4 26-1M88 102c8-3 17-4 26-1" className="stroke-primary" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M130 81c9-3 18-2 26 1M130 91c9-3 18-2 26 1" className="stroke-primary" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M131 101c6-2 11-2 16-1" className="stroke-warm" strokeWidth="3" strokeLinecap="round" />
      {/* pencil */}
      <g transform="rotate(-28 176 104)">
        <rect x="160" y="100" width="34" height="7" rx="2" className="fill-warm" />
        <path d="M194 100l8 3.5-8 3.5z" className="fill-card stroke-warm" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      {/* cup */}
      <path d="M38 96h22v14a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" className="fill-card stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M60 100h4a5 5 0 0 1 0 10h-4" className="stroke-primary" strokeWidth="2.5" fill="none" />
      <path d="M45 88c-3-4 3-6 0-10M53 88c-3-4 3-6 0-10" className="stroke-primary" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* plant */}
      <path d="M196 118h16l-3-14h-10z" className="fill-warm" />
      <path d="M204 104c0-10-6-16-12-18M204 104c0-9 5-15 12-17M204 104V84" className="stroke-success" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* speech bubble */}
      <path d="M150 20h44a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-30l-10 9v-9h-4a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" className="fill-card stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      <text x="172" y="43" textAnchor="middle" className="fill-primary" style={{ font: '700 16px "Be Vietnam Pro", sans-serif' }}>
        Aa
      </text>
    </svg>
  );
}
