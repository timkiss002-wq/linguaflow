import type { ReactNode } from 'react';
import type { DiagramKind } from '@/lib/grammar/drills';
import { cn } from '@/lib/utils';

/**
 * A small 2D picture of each grammar point: timelines for tenses, bars for comparison,
 * a flip for the passive, a meter for modals… Pure SVG, follows the light/dark theme.
 */
export function GrammarDiagram({ kind, className }: { kind: DiagramKind; className?: string }) {
  return (
    <svg viewBox="0 0 320 150" className={cn('h-auto w-full', className)} role="img" aria-label={LABEL[kind]} style={{ fontFamily: 'inherit' }}>
      {DRAW[kind]}
    </svg>
  );
}

const LABEL: Record<DiagramKind, string> = {
  habit: 'Đường thời gian: hành động lặp lại đều đặn',
  past: 'Đường thời gian: một điểm trong quá khứ, đã kết thúc',
  perfect: 'Đường thời gian: bắt đầu trong quá khứ, kéo dài đến hiện tại',
  future: 'Đường thời gian: một điểm trong tương lai',
  compare: 'Ba cột cao dần: tall, taller, the tallest',
  passive: 'Câu chủ động lật thành câu bị động',
  relative: 'Mệnh đề quan hệ gắn vào danh từ',
  conditional: 'Điều kiện dẫn tới kết quả',
  modal: 'Mức độ: can, should, must',
  linking: 'Từ nối: nguyên nhân, tương phản, kết quả',
  trend: 'Biểu đồ đường: tăng mạnh, ổn định, giảm nhẹ, đạt đỉnh',
  nouns: 'Hai hộp: danh từ đếm được có -s, danh từ không đếm được không có -s',
  agreement: 'Mũi tên nối danh từ chính với động từ: the number of tourists has',
  pattern: 'Hai nhánh: choose to live, suggest taking',
  order: 'Các ô theo thứ tự: chủ ngữ, động từ, tân ngữ, nơi chốn, thời gian',
};

const T = ({ x, y, children, size = 11, anchor = 'middle', className = 'fill-muted-foreground', bold }: { x: number; y: number; children: ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end'; className?: string; bold?: boolean }) => (
  <text x={x} y={y} fontSize={size} textAnchor={anchor} className={className} fontWeight={bold ? 700 : 500}>
    {children}
  </text>
);

/** A timeline with past · now · future. */
const Timeline = ({ children }: { children?: ReactNode }) => (
  <g>
    <defs>
      <marker id="tl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
      </marker>
    </defs>
    <line x1="16" y1="96" x2="306" y2="96" strokeWidth="2.5" className="stroke-muted-foreground/60" markerEnd="url(#tl-arrow)" />
    <line x1="200" y1="84" x2="200" y2="112" strokeWidth="2.5" strokeDasharray="4 3" className="stroke-rose-500" />
    <T x={200} y={130} className="fill-rose-600 dark:fill-rose-400" bold>
      BÂY GIỜ
    </T>
    <T x={70} y={130}>quá khứ</T>
    <T x={278} y={130}>tương lai</T>
    {children}
  </g>
);

const DRAW: Record<DiagramKind, ReactNode> = {
  habit: (
    <Timeline>
      {[40, 80, 120, 160, 200, 240, 280].map((x) => (
        <g key={x}>
          <circle cx={x} cy={96} r={7} className="fill-teal-500" />
          <path d={`M${x - 3},96 l2.5,2.5 l4,-5`} stroke="white" strokeWidth="1.8" fill="none" />
        </g>
      ))}
      <T x={160} y={40} size={13} className="fill-foreground" bold>
        every day · usually · always
      </T>
      <T x={160} y={58}>lặp đi lặp lại — hoặc luôn đúng</T>
    </Timeline>
  ),
  past: (
    <Timeline>
      <circle cx={90} cy={96} r={9} className="fill-amber-500" />
      <path d="M90,84 Q90,58 120,52" fill="none" strokeWidth="1.5" className="stroke-amber-500" />
      <T x={124} y={50} anchor="start" size={13} className="fill-foreground" bold>
        yesterday · in 2010 · ago
      </T>
      <T x={124} y={66} anchor="start">xảy ra và đã kết thúc</T>
    </Timeline>
  ),
  perfect: (
    <Timeline>
      <rect x={70} y={88} width={130} height={16} rx={8} className="fill-violet-500/80" />
      <circle cx={70} cy={96} r={8} className="fill-violet-600" />
      <T x={70} y={76} size={11} className="fill-foreground" bold>
        since 2020
      </T>
      <T x={160} y={34} size={13} className="fill-foreground" bold>
        have / has + V3
      </T>
      <T x={160} y={54} className="fill-violet-700 dark:fill-violet-300">
        for 5 years → kéo dài đến nay
      </T>
    </Timeline>
  ),
  future: (
    <Timeline>
      <line x1={200} y1={96} x2={262} y2={96} strokeWidth={3} strokeDasharray="5 4" className="stroke-sky-500" />
      <circle cx={268} cy={96} r={9} className="fill-sky-500" />
      <T x={250} y={50} size={13} className="fill-foreground" bold>
        will / be going to
      </T>
      <T x={250} y={68}>tomorrow · next year</T>
    </Timeline>
  ),
  compare: (
    <g>
      {[
        { x: 40, h: 46, label: 'tall', c: 'fill-amber-300' },
        { x: 130, h: 72, label: 'taller than', c: 'fill-amber-500' },
        { x: 220, h: 100, label: 'the tallest', c: 'fill-orange-600' },
      ].map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={122 - b.h} width={60} height={b.h} rx={6} className={b.c} />
          <T x={b.x + 30} y={140} size={12} className="fill-foreground" bold>
            {b.label}
          </T>
        </g>
      ))}
      <T x={80} y={30} size={11}>
        adj-er / more + adj
      </T>
      <T x={250} y={14} size={11}>
        the + adj-est / most
      </T>
    </g>
  ),
  passive: (
    <g>
      <Pill x={14} y={14} w={86} c="bg-teal">
        Workers
      </Pill>
      <T x={128} y={34} size={12} className="fill-foreground" bold>
        collect
      </T>
      <Pill x={156} y={14} w={150} c="bg-amber">
        the bottles
      </Pill>
      <path d="M230,48 C230,70 60,62 60,86" fill="none" strokeWidth="2" strokeDasharray="4 3" className="stroke-muted-foreground" markerEnd="url(#pv-arrow)" />
      <defs>
        <marker id="pv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <Pill x={14} y={92} w={110} c="bg-amber">
        The bottles
      </Pill>
      <T x={186} y={113} size={13} className="fill-rose-600 dark:fill-rose-400" bold>
        are collected
      </T>
      <T x={286} y={113} size={11}>
        (by workers)
      </T>
      <T x={186} y={140}>be + V3 — vật được làm</T>
    </g>
  ),
  relative: (
    <g>
      <Pill x={14} y={50} w={92} c="bg-teal">
        The man
      </Pill>
      <path d="M106,68 L126,68" strokeWidth="2" className="stroke-violet-500" />
      <rect x={126} y={46} width={180} height={44} rx={22} className="fill-violet-100 stroke-violet-400 dark:fill-violet-500/20" strokeWidth="1.5" />
      <T x={216} y={73} size={13} className="fill-violet-800 dark:fill-violet-200" bold>
        who lives next door
      </T>
      <T x={160} y={118} size={13} className="fill-foreground" bold>
        … is a doctor.
      </T>
      <T x={216} y={34}>who (người) · which (vật) · where (nơi)</T>
    </g>
  ),
  conditional: (
    <g>
      <defs>
        <marker id="cd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <Pill x={10} y={14} w={126} c="bg-sky">
        If it rains
      </Pill>
      <line x1={140} y1={32} x2={172} y2={32} strokeWidth="2" className="stroke-muted-foreground" markerEnd="url(#cd-arrow)" />
      <Pill x={176} y={14} w={134} c="bg-teal">
        we will stay
      </Pill>
      <T x={160} y={66}>Loại 1 — có thể xảy ra</T>
      <Pill x={10} y={80} w={126} c="bg-violet">
        If I were you
      </Pill>
      <line x1={140} y1={98} x2={172} y2={98} strokeWidth="2" strokeDasharray="4 3" className="stroke-muted-foreground" markerEnd="url(#cd-arrow)" />
      <Pill x={176} y={80} w={134} c="bg-violet">
        I would go
      </Pill>
      <T x={160} y={140}>Loại 2 — giả định, không có thật</T>
    </g>
  ),
  modal: (
    <g>
      <defs>
        <linearGradient id="md-grad" x1="0" x2="1">
          <stop offset="0" stopColor="#facc15" />
          <stop offset="0.5" stopColor="#fb923c" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <rect x={20} y={64} width={280} height={18} rx={9} fill="url(#md-grad)" />
      {[
        { x: 40, w: 'can', d: 'có thể' },
        { x: 160, w: 'should', d: 'nên' },
        { x: 280, w: 'must', d: 'phải' },
      ].map((m) => (
        <g key={m.w}>
          <circle cx={m.x} cy={73} r={6} fill="white" />
          <T x={m.x} y={50} size={15} className="fill-foreground" bold>
            {m.w}
          </T>
          <T x={m.x} y={104}>{m.d}</T>
        </g>
      ))}
      <T x={160} y={134} size={12} className="fill-foreground">
        + V nguyên mẫu (không to, không -s)
      </T>
    </g>
  ),
  linking: (
    <g>
      {[
        { y: 8, word: 'because', c: 'bg-sky', d: 'vì — nguyên nhân' },
        { y: 54, word: 'although · however', c: 'bg-rose', d: 'nhưng — trái ngược' },
        { y: 100, word: 'so · therefore', c: 'bg-teal', d: 'nên — kết quả' },
      ].map((r) => (
        <g key={r.word}>
          <rect x={10} y={r.y + 8} width={44} height={26} rx={6} className="fill-muted" />
          <T x={32} y={r.y + 26} className="fill-foreground" bold>
            A
          </T>
          <Pill x={62} y={r.y + 4} w={150} c={r.c}>
            {r.word}
          </Pill>
          <rect x={220} y={r.y + 8} width={44} height={26} rx={6} className="fill-muted" />
          <T x={242} y={r.y + 26} className="fill-foreground" bold>
            B
          </T>
          <T x={270} y={r.y + 25} anchor="start" size={9}>
            {r.d}
          </T>
        </g>
      ))}
    </g>
  ),
  trend: (
    <g>
      <line x1={24} y1={126} x2={306} y2={126} strokeWidth="1.5" className="stroke-border" />
      <line x1={24} y1={126} x2={24} y2={12} strokeWidth="1.5" className="stroke-border" />
      <polyline points="24,112 92,46 150,46 196,20 250,36 306,44" fill="none" strokeWidth="3" strokeLinejoin="round" className="stroke-sky-500" />
      <T x={66} y={106} size={10} anchor="start" className="fill-foreground" bold>
        rose sharply
      </T>
      <T x={121} y={66} size={10} className="fill-foreground" bold>
        remained stable
      </T>
      <circle cx={196} cy={20} r={5} className="fill-rose-500" />
      <T x={196} y={12} size={10} className="fill-rose-600 dark:fill-rose-400" bold>
        peaked at
      </T>
      <T x={270} y={64} size={10} className="fill-foreground" bold>
        fell slightly
      </T>
      <T x={165} y={144} size={10}>
        2000 → 2020
      </T>
    </g>
  ),
  nouns: (
    <g>
      <rect x={10} y={14} width={146} height={112} rx={12} strokeWidth="1.5" className="fill-teal-100 stroke-teal-400 dark:fill-teal-500/20" />
      <T x={83} y={36} size={12} className="fill-teal-800 dark:fill-teal-200" bold>
        Đếm được
      </T>
      <T x={83} y={62} size={13} className="fill-foreground" bold>
        a problem
      </T>
      <T x={83} y={84} size={13} className="fill-foreground" bold>
        many problem<tspan className="fill-rose-600 dark:fill-rose-400">s</tspan>
      </T>
      <T x={83} y={108}>any / some + N-s</T>
      <rect x={164} y={14} width={146} height={112} rx={12} strokeWidth="1.5" className="fill-amber-100 stroke-amber-400 dark:fill-amber-500/20" />
      <T x={237} y={36} size={12} className="fill-amber-800 dark:fill-amber-200" bold>
        Không đếm được
      </T>
      <T x={237} y={62} size={13} className="fill-foreground" bold>
        information
      </T>
      <T x={237} y={84} size={13} className="fill-foreground" bold>
        much advice
      </T>
      <T x={237} y={108}>không -s · không a/an</T>
      <T x={160} y={144}>people = số nhiều của person</T>
    </g>
  ),
  agreement: (
    <g>
      <defs>
        <marker id="ag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="fill-rose-500" />
        </marker>
      </defs>
      <T x={14} y={52} size={13} anchor="start" className="fill-muted-foreground" bold>
        The
      </T>
      <Pill x={46} y={28} w={104} c="bg-sky">
        number
      </Pill>
      <T x={158} y={52} size={13} anchor="start" className="fill-muted-foreground" bold>
        of tourists
      </T>
      <Pill x={240} y={28} w={70} c="bg-rose">
        has
      </Pill>
      <path d="M98,70 C98,110 275,110 275,72" fill="none" strokeWidth="2" className="stroke-rose-500" markerEnd="url(#ag-arrow)" />
      <T x={186} y={118} size={11}>danh từ chính quyết định động từ</T>
      <T x={160} y={142} size={12} className="fill-foreground" bold>
        A number of tourists have…
      </T>
    </g>
  ),
  pattern: (
    <g>
      <Pill x={10} y={57} w={90} c="bg-violet">
        verb
      </Pill>
      <path d="M100,75 L130,36 M100,75 L130,114" strokeWidth="2" className="stroke-muted-foreground" fill="none" />
      <Pill x={132} y={16} w={178} c="bg-teal">
        choose to live
      </Pill>
      <T x={221} y={66}>decide · want · plan + to V</T>
      <Pill x={132} y={94} w={178} c="bg-amber">
        suggest taking
      </Pill>
      <T x={221} y={144}>enjoy · avoid · spend time + V-ing</T>
    </g>
  ),
  order: (
    <g>
      {[
        { x: 8, w: 60, t: 'S', d: 'chủ ngữ', c: 'bg-sky' },
        { x: 72, w: 78, t: 'V', d: 'động từ', c: 'bg-rose' },
        { x: 154, w: 60, t: 'O', d: 'tân ngữ', c: 'bg-teal' },
        { x: 218, w: 46, t: '📍', d: 'nơi', c: 'bg-amber' },
        { x: 268, w: 46, t: '⏰', d: 'lúc', c: 'bg-violet' },
      ].map((b) => (
        <g key={b.t}>
          <Pill x={b.x} y={24} w={b.w} c={b.c}>
            {b.t}
          </Pill>
          <T x={b.x + b.w / 2} y={78}>
            {b.d}
          </T>
        </g>
      ))}
      <T x={160} y={112} size={12} className="fill-foreground" bold>
        should invest more in transport
      </T>
      <T x={160} y={136} size={12} className="fill-foreground" bold>
        make better decisions
      </T>
    </g>
  ),
};

const PILL: Record<string, string> = {
  'bg-teal': 'fill-teal-100 stroke-teal-400 dark:fill-teal-500/20',
  'bg-amber': 'fill-amber-100 stroke-amber-400 dark:fill-amber-500/20',
  'bg-sky': 'fill-sky-100 stroke-sky-400 dark:fill-sky-500/20',
  'bg-violet': 'fill-violet-100 stroke-violet-400 dark:fill-violet-500/20',
  'bg-rose': 'fill-rose-100 stroke-rose-400 dark:fill-rose-500/20',
};

function Pill({ x, y, w, c, children }: { x: number; y: number; w: number; c: string; children: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={36} rx={18} strokeWidth="1.5" className={PILL[c]} />
      <T x={x + w / 2} y={y + 23} size={13} className="fill-foreground" bold>
        {children}
      </T>
    </g>
  );
}
