import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BookOpen, Download, Eye, EyeOff, Keyboard, Search, Trash2 } from 'lucide-react';
import { useStudyLanguage } from '@/features/study/context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { AddWordDialog } from '@/features/vocabulary/AddWordDialog';
import { topicOptions, useDeleteWords, useVocabulary } from '@/features/vocabulary/api';
import { countByStatus, filterWords, parseVocabFilters, STATUSES, vocabFiltersToParams, type VocabFilters } from '@/features/vocabulary/filters';
import { ImportDialog } from '@/features/vocabulary/ImportDialog';
import { VocabularyList } from '@/features/vocabulary/VocabularyTable';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { vocabularyToCsv } from '@/lib/vocab/csv';
import { POS, POS_LABEL, type Pos } from '@/lib/vocab/pos';

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function VocabularyPage() {
  const vocab = useVocabulary();
  const remove = useDeleteWords();
  const [params, setParams] = useSearchParams();
  const { lang } = useStudyLanguage();
  // only the words of the language being studied
  const filters = useMemo(() => ({ ...parseVocabFilters(params), lang }), [params, lang]);
  const setFilters = useCallback((f: VocabFilters) => setParams(vocabFiltersToParams({ ...f, lang: undefined }), { replace: true }), [setParams]);
  const [search, setSearch] = useState(filters.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hideWords, setHideWords] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (search === filters.q) return;
    const t = setTimeout(() => setFilters({ ...filters, q: search }), 250);
    return () => clearTimeout(t);
  }, [search, filters, setFilters]);
  useEffect(() => setSearch(filters.q), [filters.q]);

  const all = vocab.data ?? [];
  const words = filterWords(all, filters);
  const statusCounts = countByStatus(filterWords(all, filters, ['status']));
  const checkBase = filterWords(all, filters, ['check']);
  const trueCount = checkBase.filter((w) => w.review_correct).length;
  const selectedIds = [...selected].filter((id) => all.some((w) => w.id === id));

  const onSelect = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const exportCsv = () => {
    const rows = [...words].reverse(); // oldest first, like a sheet
    download(`linguaflow-vocabulary-${new Date().toISOString().slice(0, 10)}.csv`, vocabularyToCsv(rows.map((w) => ({ ...w, part_of_speech: w.part_of_speech as Pos | null, examples: w.examples ?? [] }))));
  };

  const deleteSelected = () => {
    remove.mutate(selectedIds, {
      onSuccess: (ids) => {
        toast.success(`Deleted ${ids.length} word(s)`);
        setSelected(new Set());
      },
      onError: (e) => toast.error(toUserMessage(e)),
    });
  };

  const practiceHref = (ids: string[]) => `/vocabulary/practice?${new URLSearchParams(ids.length ? { ids: ids.join(',') } : filters.lang ? { lang: filters.lang } : {})}`;

  return (
    <>
      <PageHeader
        title={lang === 'zh' ? 'Sổ từ tiếng Trung' : 'Sổ từ tiếng Anh'}
        description="Your notebook of saved words. Click any cell to edit it."
        actions={
          <>
            <ImportDialog />
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={words.length === 0}>
              <Download /> Export CSV
            </Button>
            <AddWordDialog defaultLanguage={filters.lang ?? 'en'} />
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Status">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={filters.status === s.value}
                onClick={() => setFilters({ ...filters, status: filters.status === s.value ? undefined : s.value })}
                className={cn('rounded-full border px-3 py-1 text-xs font-medium', filters.status === s.value ? 'border-primary bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
              >
                {s.label} · {statusCounts[s.value]}
              </button>
            ))}
          </div>
          <div className="flex gap-1" role="group" aria-label="Check">
            {(['true', 'false'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filters.check === c}
                onClick={() => setFilters({ ...filters, check: filters.check === c ? undefined : c })}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  filters.check === c ? (c === 'true' ? 'border-success bg-success/15 text-success' : 'border-destructive bg-destructive/10 text-destructive') : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {c.toUpperCase()} · {c === 'true' ? trueCount : checkBase.length - trueCount}
              </button>
            ))}
          </div>
          <Button size="sm" className="ml-auto" asChild>
            <Link to={practiceHref([])}>
              <Keyboard /> Practise typing
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_200px_160px]">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search words, meanings (không dấu cũng được), examples…" aria-label="Search vocabulary" className="pl-9" />
          </div>
          <NativeSelect aria-label="Topic" value={filters.topic ?? ''} onChange={(e) => setFilters({ ...filters, topic: e.target.value || undefined })}>
            <option value="">All topics</option>
            {topicOptions(all).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Word type" value={filters.pos ?? ''} onChange={(e) => setFilters({ ...filters, pos: e.target.value || undefined })}>
            <option value="">All types</option>
            {POS.map((p) => (
              <option key={p} value={p}>
                {POS_LABEL[p]}
              </option>
            ))}
          </NativeSelect>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-accent/50 px-3 py-2 text-sm" role="region" aria-label="Selection">
            <span className="font-medium">{selectedIds.length} selected</span>
            <Button size="sm" asChild>
              <Link to={practiceHref(selectedIds)}>
                <Keyboard /> Practise these
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} disabled={remove.isPending}>
              <Trash2 /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
              Clear
            </Button>
          </div>
        )}

        {vocab.isError ? (
          <ErrorState error={vocab.error} onRetry={() => vocab.refetch()} />
        ) : vocab.isPending ? (
          <Skeleton className="h-80" />
        ) : all.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Your notebook is empty"
            description="Open a lesson, show the text and click any word to save it — or import your existing sheet as CSV."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/lessons">Explore lessons</Link>
              </Button>
            }
          />
        ) : words.length === 0 ? (
          <EmptyState icon={Search} title="No words match" description="Try another search or remove some filters." />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span>{`${words.length} ${words.length === 1 ? 'word' : 'words'}`}</span>
                {checkBase.length > 0 && (
                  <span className="ml-2" data-testid="check-rate">
                    · Check TRUE {trueCount}/{checkBase.length} ({Math.round((trueCount / checkBase.length) * 100)}%)
                  </span>
                )}
              </p>
              <Button size="sm" variant="ghost" aria-pressed={hideWords} onClick={() => setHideWords((h) => !h)}>
                {hideWords ? <Eye /> : <EyeOff />} {hideWords ? 'Show words' : 'Hide words (ôn từ trí nhớ)'}
              </Button>
            </div>
            <VocabularyList words={words} allWords={all} selected={selected} onSelect={onSelect} hideWords={hideWords} />
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Xoá ${selectedIds.length} từ?`}
        description="Lịch sử gõ và ôn tập của các từ này cũng bị xoá."
        confirmLabel="Xoá"
        destructive
        onConfirm={deleteSelected}
      />
    </>
  );
}
