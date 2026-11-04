import { cn } from '@/lib/utils';
import type { StatsLanguage } from './api';

export function LanguageSwitch({ value, onChange }: { value: StatsLanguage; onChange: (l: StatsLanguage) => void }) {
  return (
    <div className="flex w-fit gap-1 rounded-md border bg-card p-1" role="group" aria-label="Language">
      {([undefined, 'en', 'zh'] as const).map((l) => (
        <button
          key={l ?? 'all'}
          type="button"
          aria-pressed={value === l}
          onClick={() => onChange(l)}
          className={cn('rounded px-3 py-1.5 text-sm font-medium', value === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
        >
          {l === 'en' ? 'English' : l === 'zh' ? '中文' : 'All'}
        </button>
      ))}
    </div>
  );
}
