import { BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useVocabulary } from '@/features/vocabulary/api';
import { useWordFamilies, useWordFamilyIndex } from '@/features/wordforms/api';
import { ExerciseSession } from '@/features/wordforms/ExerciseSession';
import { FamilyGrid } from '@/features/wordforms/FamilyGrid';
import { RulesGuide } from '@/features/wordforms/RulesGuide';
import { buildItems, EXERCISES, selectFamilies, type ExerciseKind } from '@/features/wordforms/session';
import { WeakSpots } from '@/features/wordforms/WeakSpots';
import { cn } from '@/lib/utils';
import { TRAP_INFO } from '@/lib/wordforms';

const TABS = [
  { id: 'practice', label: 'Practice' },
  { id: 'families', label: 'Families' },
  { id: 'rules', label: 'Rules & traps' },
] as const;

export default function WordFormsPage() {
  const families = useWordFamilies();
  const index = useWordFamilyIndex();
  const vocab = useVocabulary();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'practice';
  const [source, setSource] = useState<'all' | 'notebook'>('all');
  const [trap, setTrap] = useState('');
  const [running, setRunning] = useState<{ kind: ExerciseKind; seed: number } | null>(null);
  const [q, setQ] = useState('');

  const notebookTerms = useMemo(() => vocab.data?.filter((w) => w.language === 'en').map((w) => w.term), [vocab.data]);
  const pool = useMemo(
    () => (families.data ? selectFamilies(families.data, { notebookTerms: source === 'notebook' ? (notebookTerms ?? []) : undefined, trap: trap || undefined }) : []),
    [families.data, source, notebookTerms, trap],
  );

  if (families.isError) return <ErrorState error={families.error} onRetry={() => families.refetch()} />;
  if (!families.data || !index) return <Skeleton className="h-96" />;

  if (running) {
    const items = buildItems(running.kind, pool, running.seed);
    return (
      <ExerciseSession
        key={running.seed}
        kind={running.kind}
        items={items}
        index={index}
        onExit={() => setRunning(null)}
        onAgain={() => setRunning({ kind: running.kind, seed: running.seed + 1 })}
      />
    );
  }

  const shown = families.data.filter((f) => !q.trim() || f.members.some((m) => m.word.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <>
      <PageHeader title="Word Forms" description="Noun, verb, adjective or adverb? Practise choosing the right form — the IELTS way." />
      <div className="mb-6 flex gap-1 border-b" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium', tab === t.id ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'practice' && (
        <div className="space-y-5">
          <WeakSpots />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wf-source">Words</Label>
              <NativeSelect id="wf-source" value={source} onChange={(e) => setSource(e.target.value as 'all' | 'notebook')}>
                <option value="all">All {families.data.length} families</option>
                <option value="notebook">Families of words in my notebook</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wf-trap">Focus</Label>
              <NativeSelect id="wf-trap" value={trap} onChange={(e) => setTrap(e.target.value)}>
                <option value="">Everything</option>
                {Object.entries(TRAP_INFO).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          {pool.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No families to practise"
              description={source === 'notebook' ? 'None of your English notebook words belong to a word family yet. Choose "All families", or save words like decision, economic, reliable.' : 'Try another focus.'}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{pool.length} families selected</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(EXERCISES) as ExerciseKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRunning({ kind: k, seed: Date.now() % 100000 })}
                    className="rounded-lg border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-semibold">{EXERCISES[k].title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{EXERCISES[k].description}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'families' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a word…" aria-label="Find a word family" className="pl-9" />
          </div>
          <p className="text-sm text-muted-foreground">{shown.length} families</p>
          {shown.map((f) => (
            <Card key={f.id} className="p-4">
              <p className="mb-2 font-semibold capitalize">{f.id}</p>
              <FamilyGrid family={f} highlight={q.trim()} />
            </Card>
          ))}
        </div>
      )}

      {tab === 'rules' && <RulesGuide families={families.data} />}
    </>
  );
}
