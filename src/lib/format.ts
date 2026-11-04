const pad = (n: number) => String(n).padStart(2, '0');

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Segment timestamp with tenths: 80.25 → "01:20.2". */
export function formatTimestamp(seconds: number): string {
  const tenths = Math.floor(seconds * 10);
  const s = Math.floor(tenths / 10);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${tenths % 10}`;
}
