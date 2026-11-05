import { Pause, Play, Repeat, Snail, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { PLAYBACK_RATES } from '@/features/profile/schemas';
import { cn } from '@/lib/utils';
import { Kbd } from './Kbd';

export const SLOW_RATE = 0.6;

interface Props {
  playing: 'normal' | 'slow' | 'loop' | null;
  rate: number;
  volume: number;
  onPlay: () => void;
  onSlow: () => void;
  onLoop: () => void;
  onStop: () => void;
  onRate: (r: number) => void;
  onVolume: (v: number) => void;
}

export function AudioPanel({ playing, rate, volume, onPlay, onSlow, onLoop, onStop, onRate, onVolume }: Props) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 px-4 py-5 text-white sm:gap-4 sm:py-8">
        <button
          type="button"
          onClick={playing === 'normal' ? onStop : onPlay}
          aria-label={playing === 'normal' ? 'Stop' : 'Play sentence'}
          className="flex size-16 items-center justify-center rounded-full bg-white text-teal-700 shadow-lg ring-8 ring-white/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-white/60 sm:size-20"
        >
          {playing === 'normal' ? <Pause className="size-8" /> : <Play className="ml-1 size-8" />}
        </button>
        <div className="flex h-6 items-end gap-[3px]" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className={cn('w-1 rounded-full bg-white/60', playing && 'animate-pulse')}
              style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 6) * 120}ms` }}
            />
          ))}
        </div>
        <p className="hidden text-xs text-white/85 sm:block">
          <Kbd dark>Alt</Kbd> + <Kbd dark>R</Kbd> replay
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={playing === 'slow' ? onStop : onSlow} aria-pressed={playing === 'slow'}>
          <Snail /> {playing === 'slow' ? 'Stop' : 'Slow'}
        </Button>
        <Button variant="outline" onClick={playing === 'loop' ? onStop : onLoop} aria-pressed={playing === 'loop'} className={cn(playing === 'loop' && 'bg-accent text-accent-foreground')}>
          <Repeat /> {playing === 'loop' ? 'Stop loop' : 'Loop'}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="dict-rate" className="text-muted-foreground">
            Speed
          </Label>
          <div className="w-28">
            <NativeSelect id="dict-rate" value={rate} onChange={(e) => onRate(Number(e.target.value))} className="h-8 text-xs">
              {PLAYBACK_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="dict-volume" className="text-muted-foreground">
            <Volume2 className="size-4" />
            <span className="sr-only">Volume</span>
          </Label>
          <input
            id="dict-volume"
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--primary))]"
          />
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{volume}%</span>
        </div>
      </div>
    </Card>
  );
}
