import { Heart, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { useTopics } from './api';
import { HSK_LEVELS, LEVELS } from './constants';
import { hasActiveFilters, type LibraryFilters as Filters } from './filters';

/** Search, topic, level, HSK (Chinese only), favourites. The language comes from "Hôm nay học" in the top bar. */
export function LibraryFilters({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const topics = useTopics();
  const [search, setSearch] = useState(value.q);

  // Debounce typing → URL.
  useEffect(() => {
    if (search === value.q) return;
    const t = setTimeout(() => onChange({ ...value, q: search }), 300);
    return () => clearTimeout(t);
  }, [search, value, onChange]);

  // Reflect external changes (back button, "clear").
  useEffect(() => setSearch(value.q), [value.q]);

  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons…" aria-label="Search lessons" className="pl-9" maxLength={100} />
        </div>
      </div>

      <div className={cn('grid grid-cols-2 gap-3', value.lang === 'en' ? 'md:grid-cols-[1fr_1fr_auto]' : 'md:grid-cols-[1fr_1fr_1fr_auto]')}>
        <NativeSelect aria-label="Topic" value={value.topic ?? ''} onChange={(e) => set({ topic: e.target.value || undefined })}>
          <option value="">All topics</option>
          {topics.data?.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Level" value={value.level ?? ''} onChange={(e) => set({ level: (e.target.value || undefined) as Filters['level'] })}>
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </NativeSelect>
        {value.lang !== 'en' && (
        <NativeSelect
          aria-label="HSK level"
          value={value.hsk ?? ''}
          onChange={(e) => set({ hsk: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Any HSK</option>
          {HSK_LEVELS.map((h) => (
            <option key={h} value={h}>
              HSK {h}
            </option>
          ))}
        </NativeSelect>
        )}
        <Button
          type="button"
          variant="outline"
          aria-pressed={value.favoritesOnly}
          onClick={() => set({ favoritesOnly: !value.favoritesOnly })}
          className={cn('h-10', value.favoritesOnly && 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40')}
        >
          <Heart className={cn(value.favoritesOnly && 'fill-current')} /> Favorites
        </Button>
      </div>

      {hasActiveFilters({ ...value, lang: undefined }) && (
        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => onChange({ q: '', favoritesOnly: false, lang: value.lang })}>
          <X /> Clear all filters
        </Button>
      )}
    </div>
  );
}
