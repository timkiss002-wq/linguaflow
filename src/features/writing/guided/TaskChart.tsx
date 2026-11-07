import { ArrowRight, ArrowUp, Table2 } from 'lucide-react';
import { useState } from 'react';
import type { ChartSpec, MapFeature } from '@/lib/writing/guided';
import { cn } from '@/lib/utils';

/**
 * The figure of an IELTS Academic Task 1 prompt: line graph, grouped bar chart, pie charts, table, process
 * diagram or before/after maps. Series colours are the validated categorical slots (--viz-1…4, light and dark steps in index.css);
 * every series is also named in text (end labels, legend, slice labels), and a table view is always available.
 */
const COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)'];

export function TaskChart({ chart, compact = false }: { chart: ChartSpec; compact?: boolean }) {
  const [table, setTable] = useState(false);
  const canTable = chart.kind === 'line' || chart.kind === 'bar' || chart.kind === 'pie';
  return (
    <figure className={cn('mx-auto space-y-2', chart.kind === 'process' || chart.kind === 'table' || (chart.kind === 'map' && !compact) ? 'max-w-3xl' : compact ? 'max-w-lg' : 'max-w-2xl')} data-testid="task-chart" data-kind={chart.kind}>
      <figcaption className="text-center text-sm font-semibold">{chart.title}</figcaption>
      {table && canTable ? (
        <DataTable chart={chart} />
      ) : chart.kind === 'line' ? (
        <Line chart={chart} compact={compact} />
      ) : chart.kind === 'bar' ? (
        <Bars chart={chart} compact={compact} />
      ) : chart.kind === 'pie' ? (
        <Pies chart={chart} />
      ) : chart.kind === 'table' ? (
        <DataTable chart={chart} />
      ) : chart.kind === 'map' ? (
        <Maps chart={chart} compact={compact} />
      ) : (
        <Process steps={chart.steps} />
      )}
      {canTable && (
        <button type="button" onClick={() => setTable((t) => !t)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
          <Table2 className="size-3.5" aria-hidden /> {table ? 'Xem biểu đồ' : 'Xem số liệu dạng bảng'}
        </button>
      )}
    </figure>
  );
}

/** A round axis maximum and its step. */
function scale(max: number): { top: number; step: number } {
  const rough = max / 5;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  return { top: Math.ceil(max / step) * step, step };
}


function Line({ chart, compact }: { chart: Extract<ChartSpec, { kind: 'line' }>; compact: boolean }) {
  // a narrower drawing when compact, so the text stays readable at small sizes
  const W = compact ? 480 : 640;
  const H = compact ? 280 : 310;
  const m = { l: 48, r: 120, t: 14, b: 32 };
  const { top, step } = scale(Math.max(...chart.series.flatMap((s) => s.values)));
  const x = (i: number) => m.l + (i * (W - m.l - m.r)) / (chart.x.length - 1);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
  // end labels, pushed apart so they never overlap
  const ends = chart.series.map((s, i) => ({ i, y: y(s.values[s.values.length - 1]!) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k]!.y = Math.max(ends[k]!.y, ends[k - 1]!.y + 15);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${chart.title}. Unit: ${chart.unit}.`}>
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[14px] tabular-nums">
              {v}
            </text>
          </g>
        ))}
        {chart.x.map((t, i) => (
          <text key={t} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[14px] tabular-nums">
            {t}
          </text>
        ))}
        {chart.series.map((s, si) => (
          <g key={s.name}>
            <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={COLORS[si]} strokeWidth={2} strokeLinejoin="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={COLORS[si]} stroke="hsl(var(--card))" strokeWidth={2}>
                <title>{`${s.name}, ${chart.x[i]}: ${v}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {ends.map(({ i, y: ly }) => (
          <text key={i} x={W - m.r + 10} y={ly + 4} className="fill-foreground text-[15px] font-medium">
            {chart.series[i]!.name}
          </text>
        ))}
      </svg>
      <p className="text-center text-xs text-muted-foreground">{chart.unit}</p>
    </div>
  );
}

function Legend({ names }: { names: string[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {names.map((n, i) => (
        <li key={n} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: COLORS[i] }} aria-hidden />
          {n}
        </li>
      ))}
    </ul>
  );
}

function Bars({ chart, compact }: { chart: Extract<ChartSpec, { kind: 'bar' }>; compact: boolean }) {
  const W = compact ? 480 : 640;
  const H = compact ? 280 : 300;
  const m = { l: 52, r: 8, t: 22, b: 32 };
  const { top, step } = scale(Math.max(...chart.series.flatMap((s) => s.values)));
  const groupW = (W - m.l - m.r) / chart.categories.length;
  const barW = Math.min(36, (groupW * 0.7) / chart.series.length);
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
  const base = y(0);
  return (
    <div className="space-y-1">
      <Legend names={chart.series.map((s) => s.name)} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${chart.title}. Unit: ${chart.unit}.`}>
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[14px] tabular-nums">
              {v}
              {chart.unit === '%' ? '%' : ''}
            </text>
          </g>
        ))}
        {chart.categories.map((c, ci) => {
          const gx = m.l + ci * groupW + (groupW - barW * chart.series.length - 2 * (chart.series.length - 1)) / 2;
          return (
            <g key={c}>
              {chart.series.map((s, si) => {
                const v = s.values[ci]!;
                const bx = gx + si * (barW + 2);
                const by = y(v);
                const r = Math.min(4, (base - by) / 2);
                return (
                  <g key={s.name}>
                    {/* rounded data end, square at the baseline */}
                    <path d={`M${bx},${base} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + barW - r} Q${bx + barW},${by} ${bx + barW},${by + r} V${base} Z`} fill={COLORS[si]}>
                      <title>{`${s.name}, ${c}: ${v}${chart.unit === '%' ? '%' : ` ${chart.unit}`}`}</title>
                    </path>
                    <text x={bx + barW / 2} y={by - 4} textAnchor="middle" className="fill-muted-foreground text-[13px] tabular-nums">
                      {v}
                    </text>
                  </g>
                );
              })}
              <text x={m.l + ci * groupW + groupW / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[14px]">
                {c}
              </text>
            </g>
          );
        })}
      </svg>
      {chart.unit !== '%' && <p className="text-center text-xs text-muted-foreground">{chart.unit}</p>}
    </div>
  );
}

function Pies({ chart }: { chart: Extract<ChartSpec, { kind: 'pie' }> }) {
  // colour follows the entity: the same source keeps its colour in every pie
  const names = [...new Set(chart.pies.flatMap((p) => p.slices.map((s) => s.name)))];
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {chart.pies.map((p) => {
          const total = p.slices.reduce((n, s) => n + s.value, 0);
          let at = -Math.PI / 2;
          const R = 80;
          return (
            <svg key={p.label} viewBox="-150 -110 300 245" className="mx-auto w-full max-w-xs" role="img" aria-label={`${p.label}: ${p.slices.map((s) => `${s.name} ${s.value}${chart.unit}`).join(', ')}`}>
              {p.slices.map((s) => {
                const a = (s.value / total) * Math.PI * 2;
                const [x1, y1] = [R * Math.cos(at), R * Math.sin(at)];
                const mid = at + a / 2;
                at += a;
                const [x2, y2] = [R * Math.cos(at), R * Math.sin(at)];
                const lx = (R + 16) * Math.cos(mid);
                const ly = (R + 16) * Math.sin(mid);
                return (
                  <g key={s.name}>
                    <path d={`M0,0 L${x1},${y1} A${R},${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z`} fill={COLORS[names.indexOf(s.name)]} stroke="hsl(var(--card))" strokeWidth={2}>
                      <title>{`${p.label}, ${s.name}: ${s.value}${chart.unit}`}</title>
                    </path>
                    <text x={lx} y={ly + 4} textAnchor={lx > 4 ? 'start' : lx < -4 ? 'end' : 'middle'} className="fill-foreground text-[14px] tabular-nums">
                      {s.value}
                      {chart.unit}
                    </text>
                  </g>
                );
              })}
              <text x={0} y={R + 48} textAnchor="middle" className="fill-foreground text-[15px] font-semibold">
                {p.label}
              </text>
            </svg>
          );
        })}
      </div>
      <Legend names={names} />
    </div>
  );
}

function DataTable({ chart }: { chart: ChartSpec }) {
  let head: string[] = [];
  let rows: string[][] = [];
  if (chart.kind === 'table') [head, rows] = [chart.columns, chart.rows];
  else if (chart.kind === 'line') [head, rows] = [['', ...chart.x], chart.series.map((s) => [s.name, ...s.values.map(String)])];
  else if (chart.kind === 'bar') [head, rows] = [['', ...chart.categories], chart.series.map((s) => [s.name, ...s.values.map((v) => `${v}${chart.unit === '%' ? '%' : ''}`)])];
  else if (chart.kind === 'pie') {
    const names = [...new Set(chart.pies.flatMap((p) => p.slices.map((s) => s.name)))];
    [head, rows] = [['', ...chart.pies.map((p) => p.label)], names.map((n) => [n, ...chart.pies.map((p) => `${p.slices.find((s) => s.name === n)?.value ?? 0}${chart.unit}`)])];
  }
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto text-sm">
        <thead>
          <tr className="border-b">
            {head.map((h, i) => (
              <th key={i} className={cn('px-3 py-1.5 font-semibold', i === 0 ? 'text-left' : 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, i) => (
                <td key={i} className={cn('px-3 py-1.5', i === 0 ? 'text-left font-medium' : 'text-right tabular-nums')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Process({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-stretch justify-center gap-y-3 text-sm">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center">
          <span className="flex w-36 flex-col items-center gap-1 rounded-lg border bg-muted/40 px-2 py-2 text-center">
            <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{i + 1}</span>
            <span className="leading-snug">{s}</span>
          </span>
          {i < steps.length - 1 && <ArrowRight className="mx-1 size-4 shrink-0 text-muted-foreground" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

/* ───────────── maps ───────────── */

// grid units → drawing units; the grid is 100 × 70 (see MapFeature)
const U = 4;
// land use is told apart by fill AND by its printed name; tints keep the dark text readable in both themes
const MAP_FILL: Record<MapFeature['kind'], { fill: string; opacity: number; stroke?: string; dash?: string }> = {
  building: { fill: 'hsl(var(--card))', opacity: 1, stroke: 'hsl(var(--foreground))' },
  field: { fill: 'var(--viz-4)', opacity: 0.28 },
  green: { fill: 'var(--viz-3)', opacity: 0.38 },
  water: { fill: 'var(--viz-1)', opacity: 0.32 },
  road: { fill: 'hsl(var(--muted-foreground))', opacity: 0.35 },
  paved: { fill: 'hsl(var(--muted-foreground))', opacity: 0.15, stroke: 'hsl(var(--muted-foreground))', dash: '4 3' },
};
// drawn bottom-up: water and land first, roads over them, buildings on top
const LAYER: MapFeature['kind'][] = ['water', 'field', 'green', 'paved', 'road', 'building'];

function Maps({ chart, compact }: { chart: Extract<ChartSpec, { kind: 'map' }>; compact: boolean }) {
  return (
    <div className={cn('grid gap-3', !compact && 'sm:grid-cols-2')}>
      {chart.maps.map((m) => (
        <MapPanel key={m.label} label={m.label} features={m.features} />
      ))}
    </div>
  );
}

function MapPanel({ label, features }: { label: string; features: MapFeature[] }) {
  const W = 100 * U;
  const H = 70 * U;
  const sorted = [...features].sort((a, b) => LAYER.indexOf(a.kind) - LAYER.indexOf(b.kind));
  return (
    <div className="space-y-1">
      <div className="relative">
        <p className="text-center text-sm font-semibold">{label}</p>
        <span className="absolute right-1 top-0 inline-flex items-center text-xs font-semibold text-muted-foreground" title="North">
          <ArrowUp className="size-3.5" aria-hidden />N
        </span>
      </div>
      <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} className="w-full" role="img" aria-label={`Map, ${label}: ${features.map((f) => f.name).join(', ')}`}>
        <rect x={0} y={0} width={W} height={H} fill="hsl(var(--muted))" fillOpacity={0.35} stroke="hsl(var(--border))" />
        {sorted.map((f, i) => {
          const st = MAP_FILL[f.kind];
          return (
            <rect key={i} x={f.x * U} y={f.y * U} width={f.w * U} height={f.h * U} rx={f.kind === 'building' ? 3 : f.kind === 'road' ? 0 : 6} fill={st.fill} fillOpacity={st.opacity} stroke={st.stroke} strokeOpacity={st.stroke ? 0.6 : undefined} strokeDasharray={st.dash}>
              <title>{f.name}</title>
            </rect>
          );
        })}
        {sorted.map((f, i) => {
          const lines = f.w * U < 90 && f.name.includes(' ') ? f.name.split(' ') : [f.name];
          const cx = (f.lx ?? f.x + f.w / 2) * U;
          const cy = (f.ly ?? f.y + f.h / 2) * U;
          const size = f.kind === 'road' && f.lx == null ? 11 : 13;
          return (
            <text key={i} x={cx} y={cy - ((lines.length - 1) * (size + 1)) / 2 + size / 3} textAnchor="middle" className={cn('fill-foreground', f.kind === 'building' && 'font-medium')} style={{ fontSize: size }}>
              {lines.map((l, k) => (
                <tspan key={k} x={cx} dy={k ? size + 1 : 0}>
                  {l}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
