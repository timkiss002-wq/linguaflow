import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Segment } from './api';
import type { Language } from './constants';

/** Transcript is hidden by default so it doesn't spoil the dictation. */
export function SegmentList({ segments, language }: { segments: Segment[]; language: Language }) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-sm text-muted-foreground">{segments.length} sentences</p>
        <Button variant="ghost" size="sm" onClick={() => setReveal((r) => !r)} aria-pressed={reveal}>
          {reveal ? <EyeOff /> : <Eye />} {reveal ? 'Hide transcript' : 'Show transcript'}
        </Button>
      </div>
      <ol className="divide-y">
        {segments.map((s) => (
          <li key={s.id} className="flex gap-4 px-4 py-3 text-sm">
            <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{s.position}</span>
            <span className="w-32 shrink-0 font-mono text-xs leading-5 text-muted-foreground">
              {formatTimestamp(s.start_time)}–{formatTimestamp(s.end_time)}
            </span>
            <span lang={language === 'zh' ? 'zh' : undefined} className={cn('flex-1', !reveal && 'select-none blur-sm')} aria-hidden={!reveal}>
              {s.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
