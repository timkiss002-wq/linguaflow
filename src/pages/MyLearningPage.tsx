import { CheckCircle2, Heart, PlayCircle } from 'lucide-react';
import { useStudyLanguage } from '@/features/study/context';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useUser } from '@/features/auth/useAuth';
import { useFavoriteIds, useProgressMap, type LessonSummary } from '@/features/library/api';
import { LessonGrid, LessonGridSkeleton } from '@/features/library/LessonGrid';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'in-progress', label: 'In progress', icon: PlayCircle },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'favorites', label: 'Favorites', icon: Heart },
] as const;
type Tab = (typeof TABS)[number]['id'];

const EMPTY: Record<Tab, { title: string; description: string }> = {
  'in-progress': { title: 'Nothing in progress', description: 'Lessons you start practising will show up here so you can continue where you left off.' },
  completed: { title: 'No completed lessons yet', description: 'Finish every sentence of a lesson to see it here.' },
  favorites: { title: 'No favorites yet', description: 'Tap the heart on any lesson to save it for later.' },
};

export default function MyLearningPage() {
  const user = useUser();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as Tab) : 'in-progress';

  const progress = useProgressMap();
  const favorites = useFavoriteIds();
  const { lang } = useStudyLanguage();

  const ids =
    tab === 'favorites'
      ? [...(favorites.data ?? [])]
      : [...(progress.data?.values() ?? [])].filter((p) => (tab === 'completed' ? p.status === 'completed' : p.status === 'in_progress')).map((p) => p.lesson_id!);
  const ready = tab === 'favorites' ? favorites.isSuccess : progress.isSuccess;

  const lessons = useQuery({
    queryKey: ['my-learning', user.id, tab, lang, [...ids].sort()],
    enabled: ready,
    queryFn: async (): Promise<LessonSummary[]> => {
      if (ids.length === 0) return [];
      const { data, error } = await getSupabase().from('lesson_catalog').select('*').in('id', ids).eq('language', lang);
      if (error) throw error;
      // Most recently studied first.
      const last = (id: string) => progress.data?.get(id)?.last_studied_at ?? '';
      return data.sort((a, b) => last(b.id!).localeCompare(last(a.id!)));
    },
  });

  const error = progress.error ?? favorites.error ?? lessons.error;

  return (
    <>
      <PageHeader title="My Learning" description="Your lessons in progress, finished, and saved for later." />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setParams({ tab: id }, { replace: true })}
            className={cn(
              '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => { progress.refetch(); favorites.refetch(); lessons.refetch(); }} />
      ) : !lessons.isSuccess ? (
        <LessonGridSkeleton count={3} />
      ) : lessons.data.length === 0 ? (
        <EmptyState
          icon={TABS.find((t) => t.id === tab)!.icon}
          title={EMPTY[tab].title}
          description={EMPTY[tab].description}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/lessons">Explore lessons</Link>
            </Button>
          }
        />
      ) : (
        <LessonGrid lessons={lessons.data} favorites={favorites.data} progress={progress.data} />
      )}
    </>
  );
}
