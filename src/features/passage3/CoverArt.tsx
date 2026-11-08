import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Illustration for a reading set's card: a soft gradient and a simple line drawing of the topic.
 * Drawn in SVG so it needs no image files and stays sharp at any size.
 */

const PALETTES: [string, string][] = [
  ['#5B8DEF', '#8E7CF0'],
  ['#2BB7A8', '#58D68D'],
  ['#F2994A', '#F2C94C'],
  ['#EB5757', '#F2994A'],
  ['#9B51E0', '#EB6FA5'],
  ['#2D9CDB', '#56CCF2'],
  ['#27AE60', '#A3CB38'],
  ['#4F6D7A', '#7FA7B5'],
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const S = {
  fill: 'none',
  stroke: 'white',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const F = { fill: 'white' } as const;

const MOTIFS: Record<string, ReactNode> = {
  city: (
    <g {...S}>
      <path d="M30 70V40h14v30M44 70V28h16v42M60 70V46h12v24M72 70V34h16v36M24 70h70" />
      <path d="M49 36h6M49 44h6M49 52h6M77 42h6M77 50h6M35 48h4M35 56h4" strokeWidth={2.5} />
    </g>
  ),
  building: (
    <g {...S}>
      <path d="M30 38 60 22l30 16zM32 70h56M30 76h60" />
      <path d="M38 42v26M50 42v26M70 42v26M82 42v26" />
    </g>
  ),
  book: (
    <g {...S}>
      <path d="M60 32c-8-6-20-7-30-4v40c10-3 22-2 30 4 8-6 20-7 30-4V28c-10-3-22-2-30 4zM60 32v40" />
      <path d="M36 40h16M36 48h16M68 40h16M68 48h16" strokeWidth={2} />
    </g>
  ),
  flask: (
    <g {...S}>
      <path d="M52 22h16M55 22v16L40 66a5 5 0 0 0 4 7h32a5 5 0 0 0 4-7L65 38V22" />
      <path d="M45 56h30" />
      <circle cx="56" cy="64" r="2.5" {...F} stroke="none" />
      <circle cx="66" cy="61" r="2" {...F} stroke="none" />
      <circle cx="80" cy="30" r="3" />
      <circle cx="88" cy="20" r="2" />
    </g>
  ),
  leaf: (
    <g {...S}>
      <path d="M34 70C30 40 52 22 88 22c2 34-20 52-50 48z" />
      <path d="M34 70 70 36M50 54h12M58 46v-10" strokeWidth={2.5} />
    </g>
  ),
  wave: (
    <g {...S}>
      <circle cx="82" cy="28" r="8" />
      <path d="M22 50c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" />
      <path d="M22 62c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" />
      <path d="M22 74c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" strokeWidth={2} />
    </g>
  ),
  chip: (
    <g {...S}>
      <rect x="40" y="27" width="40" height="40" rx="6" />
      <rect x="50" y="37" width="20" height="20" rx="3" />
      <path d="M48 27v-7M60 27v-7M72 27v-7M48 67v7M60 67v7M72 67v7M40 35h-7M40 47h-7M40 59h-7M80 35h7M80 47h7M80 59h7" strokeWidth={2.5} />
    </g>
  ),
  ship: (
    <g {...S}>
      <path d="M24 56h72l-8 14H34z" />
      <path d="M36 56V44h14v12M50 56V40h14v16M64 56V46h12v10M78 46V34h4v12" />
      <path d="M20 76c8 4 16 4 24 0s16-4 24 0 16 4 24 0" strokeWidth={2} />
    </g>
  ),
  mountain: (
    <g {...S}>
      <path d="M20 72 48 28l14 22 8-12 30 34z" />
      <path d="M40 41l8 6 6-5" />
      <circle cx="86" cy="24" r="5" />
    </g>
  ),
  people: (
    <g {...S}>
      <circle cx="60" cy="34" r="8" />
      <path d="M44 70c0-12 7-20 16-20s16 8 16 20" />
      <circle cx="36" cy="42" r="6" />
      <path d="M24 70c0-9 5-15 12-15 3 0 6 1 8 3" />
      <circle cx="84" cy="42" r="6" />
      <path d="M96 70c0-9-5-15-12-15-3 0-6 1-8 3" />
    </g>
  ),
  chart: (
    <g {...S}>
      <path d="M26 72h68M26 72V22" />
      <path d="M36 72V56M50 72V46M64 72V52M78 72V36" strokeWidth={6} />
      <path d="M34 48l14-12 14 6 22-18" />
      <path d="M78 24h6v6" />
    </g>
  ),
  bird: (
    <g {...S}>
      <path d="M26 46c8-8 14-8 18 0 4-8 10-8 18 0" />
      <path d="M58 32c6-6 10-6 13 0 3-6 7-6 13 0" />
      <path d="M70 60c5-5 9-5 11 0 2-5 6-5 11 0" strokeWidth={2.5} />
      <path d="M20 74c20-6 60-6 80 0" strokeWidth={2} />
    </g>
  ),
  music: (
    <g {...S}>
      <path d="M50 64V30l32-8v34" />
      <ellipse cx="43" cy="64" rx="7" ry="5.5" {...F} />
      <ellipse cx="75" cy="56" rx="7" ry="5.5" {...F} />
      <path d="M50 38l32-8" />
    </g>
  ),
  star: (
    <g {...S}>
      <path d="M60 24l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" />
      <path d="M30 30v8M26 34h8M88 60v8M84 64h8M34 64v4M32 66h4" strokeWidth={2.5} />
    </g>
  ),
  road: (
    <g {...S}>
      <path d="M50 22 30 76M70 22l20 54" />
      <path d="M60 30v6M60 46v8M60 64v10" strokeWidth={3.5} />
      <circle cx="88" cy="34" r="6" />
      <circle cx="104" cy="34" r="6" />
      <path d="M88 34l6-9h6l4 9M94 25l-2-4" strokeWidth={2} />
    </g>
  ),
  battery: (
    <g {...S}>
      <rect x="32" y="32" width="52" height="30" rx="5" />
      <path d="M84 41h5v12h-5" />
      <path d="M60 36l-8 12h10l-6 11" strokeWidth={3.5} />
    </g>
  ),
  clock: (
    <g {...S}>
      <circle cx="60" cy="47" r="24" />
      <path d="M60 33v14l10 7" />
      <path d="M60 25v3M60 66v3M38 47h3M79 47h3" strokeWidth={2.5} />
    </g>
  ),
  coin: (
    <g {...S}>
      <ellipse cx="50" cy="64" rx="18" ry="6" />
      <path d="M32 64v-8c0 3 8 6 18 6s18-3 18-6v8M32 56v-8c0 3 8 6 18 6s18-3 18-6v8" />
      <ellipse cx="50" cy="48" rx="18" ry="6" />
      <circle cx="80" cy="34" r="12" />
      <path d="M80 28v12M76 31h6a2 2 0 0 1 0 3h-4a2 2 0 0 0 0 3h6" strokeWidth={2} />
    </g>
  ),
  globe: (
    <g {...S}>
      <circle cx="60" cy="47" r="24" />
      <ellipse cx="60" cy="47" rx="10" ry="24" />
      <path d="M36 47h48M40 35h40M40 59h40" strokeWidth={2.5} />
    </g>
  ),
  brain: (
    <g {...S}>
      <path d="M58 26c-6-4-14-2-16 4-7 0-11 7-8 13-5 4-4 12 2 15 0 7 8 11 14 8 3 4 8 4 8 0z" />
      <path d="M62 26c6-4 14-2 16 4 7 0 11 7 8 13 5 4 4 12-2 15 0 7-8 11-14 8-3 4-8 4-8 0z" />
      <path d="M60 26v40M46 40c4 0 6 3 6 6M74 40c-4 0-6 3-6 6M44 56c4-2 8 0 8 4M76 56c-4-2-8 0-8 4" strokeWidth={2.2} />
    </g>
  ),
  sun: (
    <g {...S}>
      <circle cx="40" cy="34" r="8" />
      <path d="M40 20v-4M40 52v-4M26 34h-4M58 34h-4M30 24l-3-3M50 44l3 3M50 24l3-3M30 44l-3 3" strokeWidth={2.5} />
      <path d="M78 76V44" />
      <path d="M78 44l-3-20M78 44l18 8M78 44l-15 13" />
      <circle cx="78" cy="44" r="2.5" {...F} />
    </g>
  ),
};

export function CoverArt({ id, art, className, label }: { id: string; art?: string; className?: string; label?: string }) {
  const [a, b] = PALETTES[hash(id) % PALETTES.length]!;
  const gid = `cov-${id}`;
  const h = hash(id);
  return (
    <svg
      viewBox="0 0 120 90"
      className={cn('block overflow-hidden', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill={`url(#${gid})`} />
      <circle cx={10 + (h % 30)} cy={80 - (h % 20)} r="28" fill="white" opacity="0.12" />
      <circle cx={100 - (h % 25)} cy={10 + (h % 15)} r="20" fill="white" opacity="0.1" />
      {MOTIFS[art ?? ''] ?? MOTIFS.book}
    </svg>
  );
}
