import { Loader2, SearchX } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useFavoriteIds, useLessonCatalog, useProgressMap } from '@/features/library/api';
import { hasActiveFilters, parseFilters, toSearchParams, type LibraryFilters as Filters } from '@/features/library/filters';
import { LessonGrid, LessonGridSkeleton } from '@/features/library/LessonGrid';
import { LibraryFilters } from '@/features/library/LibraryFilters';
import { RecommendedList } from '@/features/learner/RecommendedLessons';
import { useRecommendations } from '@/features/learner/useRecommendations';
import { useStudyLanguage } from '@/features/study/context';

export default function LessonsPage() {
  const [params, setParams] = useSearchParams();
  const { lang } = useStudyLanguage();
  // only lessons of the language being studied
  const filters = useMemo(() => {
    const f = parseFilters(params);
    return { ...f, lang, hsk: lang === 'en' ? undefined : f.hsk };
  }, [params, lang]);
  const setFilters = useCallback((f: Filters) => setParams(toSearchParams({ ...f, lang: undefined }), { replace: true }), [setParams]);

  const favorites = useFavoriteIds();
  const progress = useProgressMap();
  const catalog = useLessonCatalog(filters, favorites.data);
  const recs = useRecommendations(2);
  const forYou = (recs ?? []).filter((r) => !filters.lang || r.language === filters.lang).flatMap((r) => r.items);

  const lessons = catalog.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = catalog.data?.pages[0]?.total ?? 0;

  return (
    <>
      <PageHeader title={lang === 'zh' ? 'Kho bài nghe tiếng Trung' : 'Kho bài nghe tiếng Anh'} description="Bài nghe được đọc từng câu để bạn chép lại. Chọn bài hợp trình độ." />
      {forYou.length > 0 && !hasActiveFilters({ ...filters, lang: undefined }) && (
        <section className="mb-8 space-y-3" aria-label="Recommended for you">
          <h2 className="text-lg font-bold">For you</h2>
          <RecommendedList items={forYou} columns={2} />
        </section>
      )}
      <LibraryFilters value={filters} onChange={setFilters} />

      <div className="mt-6">
        {catalog.isError ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} title="Could not load lessons" />
        ) : catalog.isPending ? (
          <LessonGridSkeleton />
        ) : lessons.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filters.favoritesOnly && !filters.q ? 'No favorites yet' : 'No lessons match'}
            description={filters.favoritesOnly && !filters.q ? 'Tap the heart on any lesson to keep it here.' : 'Try a different search or remove some filters.'}
            action={
              hasActiveFilters({ ...filters, lang: undefined }) && (
                <Button variant="outline" size="sm" onClick={() => setFilters({ q: '', favoritesOnly: false, lang })}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {total} {total === 1 ? 'lesson' : 'lessons'}
            </p>
            <LessonGrid lessons={lessons} favorites={favorites.data} progress={progress.data} />
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
