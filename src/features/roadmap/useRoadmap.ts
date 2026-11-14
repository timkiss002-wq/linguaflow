import { useMemo, useSyncExternalStore } from 'react';
import { useVocabulary } from '@/features/vocabulary/api';
import { useP3Store } from '@/features/passage3/useP3Store';
import { getProgress } from '@/lib/ielts/passage3';
import { normaliseTerm, roadmapVersion, subscribeRoadmap, type Context, type WordState } from '@/lib/roadmap/progress';

/** Everything the path needs to tell what is done: its own ticks, the notebook, Passage 3 progress. Re-renders on any change. */
export function useRoadmapContext(): Context & { loading: boolean } {
  const version = useSyncExternalStore(subscribeRoadmap, roadmapVersion);
  const p3 = useP3Store();
  const vocab = useVocabulary();
  return useMemo(() => {
    const words = new Map<string, WordState>();
    for (const w of vocab.data ?? []) {
      if (w.language !== 'en') continue;
      words.set(normaliseTerm(w.term), { inNotebook: true, practised: w.review_correct || w.repetitions > 0 });
    }
    const p3Days = new Set(Object.values(getProgress().done).map((d) => d.at));
    return {
      notebook: vocab.data ? (term: string) => words.get(normaliseTerm(term)) ?? { inNotebook: false, practised: false } : undefined,
      p3Days,
      loading: vocab.isPending,
    };
    // version and p3 are listed so ticks and finished Passage 3 sets recompute the context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab.data, vocab.isPending, version, p3]);
}
