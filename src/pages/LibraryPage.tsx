import { Loader2, SearchX } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useFavoriteIds, useProgressMap, useVideoCatalog } from '@/features/library/api';
import { hasActiveFilters, parseFilters, toSearchParams, type LibraryFilters as Filters } from '@/features/library/filters';
import { LibraryFilters } from '@/features/library/LibraryFilters';
import { VideoGrid, VideoGridSkeleton } from '@/features/library/VideoGrid';

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const setFilters = useCallback((f: Filters) => setParams(toSearchParams(f), { replace: true }), [setParams]);

  const favorites = useFavoriteIds();
  const progress = useProgressMap();
  const catalog = useVideoCatalog(filters, favorites.data);

  const videos = catalog.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = catalog.data?.pages[0]?.total ?? 0;

  return (
    <>
      <PageHeader title="Explore Videos" description="Pick a video at your level and practise it sentence by sentence." />
      <LibraryFilters value={filters} onChange={setFilters} />

      <div className="mt-6">
        {catalog.isError ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} title="Could not load videos" />
        ) : catalog.isPending ? (
          <VideoGridSkeleton />
        ) : videos.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filters.favoritesOnly && !filters.q ? 'No favorites yet' : 'No videos match'}
            description={
              filters.favoritesOnly && !filters.q
                ? 'Tap the heart on any video to keep it here.'
                : filters.lang === 'en'
                  ? 'There are no English videos in the library yet.'
                  : 'Try a different search or remove some filters.'
            }
            action={
              hasActiveFilters(filters) && (
                <Button variant="outline" size="sm" onClick={() => setFilters({ q: '', favoritesOnly: false })}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {total} {total === 1 ? 'video' : 'videos'}
            </p>
            <VideoGrid videos={videos} favorites={favorites.data} progress={progress.data} />
            {catalog.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => catalog.fetchNextPage()} disabled={catalog.isFetchingNextPage}>
                  {catalog.isFetchingNextPage && <Loader2 className="animate-spin" />}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
