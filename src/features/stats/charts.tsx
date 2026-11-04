import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { DayActivity } from './api';

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const dayLabel = (iso: string, long = false) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'numeric' });

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4 text-muted-foreground">
          <span>{k}</span>
          <span className="font-medium tabular-nums text-foreground">{v}</span>
        </p>
      ))}
    </div>
  );
}

/** Data behind a chart as a table (accessibility + exact values). */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show data table</summary>
      <div className="mt-2 max-h-56 overflow-auto rounded border">
        <table className="w-full">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/60 text-left">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-2 py-1 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((c, j) => (
                  <td key={j} className="px-2 py-1 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Minutes studied per day — one series, columns from a zero baseline. */
export function StudyTimeChart({ data, height = 200 }: { data: DayActivity[]; height?: number }) {
  const total = data.reduce((n, d) => n + d.minutes, 0);
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`Minutes studied per day, ${Math.round(total)} minutes in total`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis dataKey="day" tickFormatter={(d: string) => dayLabel(d)} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval="preserveStartEnd" minTickGap={12} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }}
              content={({ active, payload }: TooltipProps<number, string>) => {
                const d = active ? (payload?.[0]?.payload as DayActivity | undefined) : undefined;
                return d ? (
                  <TooltipBox
                    title={dayLabel(d.day, true)}
                    rows={[
                      ['Study time', `${d.minutes} min`],
                      ['Sentences checked', String(d.attempts)],
                      ['Cards reviewed', String(d.reviews)],
                    ]}
                  />
                ) : null;
              }}
            />
            <Bar dataKey="minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Study time per day" head={['Day', 'Minutes', 'Sentences', 'Cards']} rows={data.map((d) => [dayLabel(d.day, true), d.minutes, d.attempts, d.reviews])} />
    </div>
  );
}

/** Weekly average listening accuracy (0–100%). */
export function AccuracyChart({ data, height = 200 }: { data: { week: string; accuracy: number | null; attempts: number }[]; height?: number }) {
  const rows = data.filter((d) => d.accuracy !== null);
  return (
    <div>
      <div style={{ height }} role="img" aria-label="Average listening accuracy per week">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis dataKey="week" tickFormatter={(d: string) => dayLabel(d)} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={axisTick} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
              content={({ active, payload }: TooltipProps<number, string>) => {
                const d = active ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined;
                return d ? <TooltipBox title={`Week of ${dayLabel(d.week, true)}`} rows={[['Accuracy', `${d.accuracy}%`], ['Sentences checked', String(d.attempts)]]} /> : null;
              }}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--chart-1)', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Accuracy per week" head={['Week of', 'Accuracy', 'Sentences']} rows={rows.map((d) => [dayLabel(d.week, true), `${d.accuracy}%`, d.attempts])} />
    </div>
  );
}

/** Horizontal bars with the value at the tip (plain HTML, one colour). */
export function HBarList({ items, unit = '' }: { items: { label: string; value: number; hint?: string }[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} title={i.hint}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{i.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {i.value}
              {unit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: 'var(--chart-1)' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
