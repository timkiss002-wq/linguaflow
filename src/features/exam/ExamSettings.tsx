import { Settings, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ExamPrefs, ExamTheme, TextSize } from './prefs';

const THEMES: { id: ExamTheme; label: string; swatch: string }[] = [
  { id: 'standard', label: 'Chuẩn', swatch: 'bg-white text-slate-900' },
  { id: 'cream', label: 'Nền kem', swatch: 'bg-[#f5ecd7] text-[#2b2116]' },
  { id: 'contrast', label: 'Vàng trên đen', swatch: 'bg-black text-yellow-300' },
];

/** "Settings" in the top-right corner, as in the real computer test. Also holds the how-to so it doesn't take screen space. */
export function ExamSettings({ prefs, onChange, volume, help }: { prefs: ExamPrefs; onChange: (p: Partial<ExamPrefs>) => void; volume?: boolean; help?: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Cài đặt phòng thi" data-testid="exam-settings">
          <Settings className="size-4" /> <span className="hidden xl:inline">Cài đặt</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4 text-sm">
        <div>
          <p className="mb-1.5 font-medium">Cỡ chữ</p>
          <div role="group" aria-label="Cỡ chữ" className="flex gap-1">
            {(['sm', 'md', 'lg'] as TextSize[]).map((s, i) => (
              <button
                key={s}
                type="button"
                aria-pressed={prefs.size === s}
                onClick={() => onChange({ size: s })}
                className={cn('flex-1 rounded-md border py-1 font-semibold', ['text-xs', 'text-sm', 'text-base'][i], prefs.size === s ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                {['Nhỏ', 'Vừa', 'Lớn'][i]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-medium">Màu nền</p>
          <div role="group" aria-label="Màu nền" className="grid grid-cols-3 gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={prefs.theme === t.id}
                onClick={() => onChange({ theme: t.id })}
                className={cn('rounded-md border px-1 py-2 text-xs font-medium', t.swatch, prefs.theme === t.id && 'ring-2 ring-primary ring-offset-1')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {volume && (
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 font-medium">
              <Volume2 className="size-4" aria-hidden /> Âm lượng <span className="ml-auto tabular-nums text-muted-foreground">{Math.round(prefs.volume * 100)}%</span>
            </span>
            <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(e) => onChange({ volume: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" aria-label="Âm lượng" />
          </label>
        )}
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="font-medium">Nhấp nháy đồng hồ</span>
            <span className="block text-xs text-muted-foreground">khi còn 10 phút và 5 phút</span>
          </span>
          <Switch checked={prefs.blink} onCheckedChange={(v) => onChange({ blink: v })} aria-label="Nhấp nháy đồng hồ" />
        </label>
        {help && <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">{help}</div>}
      </PopoverContent>
    </Popover>
  );
}
