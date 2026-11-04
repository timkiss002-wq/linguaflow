import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { escapeSearch, type LibraryFilters } from './filters';

export type LessonSummary = Tables<'lesson_catalog'>;
export type LessonProgress = Pick<Tables<'user_lesson_progress'>, 'lesson_id' | 'status' | 'finished_sentences' | 'last_sentence_position' | 'last_studied_at' | 'avg_accuracy'>;
export type Sentence = Pick<Tables<'lesson_sentences'>, 'id' | 'position' | 'text' | 'pinyin' | 'translation_vi' | 'difficulty'>;

export const PAGE_SIZE = 12;

export const libraryKeys = {
  topics: ['topics'] as const,
  lessons: (f: LibraryFilters, favIds: string[] | null) => ['lessons', f, favIds] as const,
  lesson: (id: string) => ['lesson', id] as const,
  sentences: (id: string) => ['lesson', id, 'sentences'] as const,
  favorites: (userId: string) => ['favorites', userId] as const,
  progress: (userId: string) => ['progress', userId] as const,
};

export function useTopics() {
  return useQuery({
    queryKey: libraryKeys.topics,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('topics').select('id, slug, name').order('id');
      if (error) throw error;
      return data;
    },
  });
}

/** Paged, filtered catalog. `favoriteIds` is only needed when filtering to favourites. */
export function useLessonCatalog(filters: LibraryFilters, favoriteIds: Set<string> | undefined) {
  const favIds = filters.favoritesOnly ? [...(favoriteIds ?? [])].sort() : null;
  return useInfiniteQuery({
    queryKey: libraryKeys.lessons(filters, favIds),
    enabled: !filters.favoritesOnly || favoriteIds !== undefined,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (favIds && favIds.length === 0) return { rows: [] as LessonSummary[], total: 0, page: 0 };
      let q = getSupabase().from('lesson_catalog').select('*', { count: 'exact' }).eq('is_published', true);
      if (filters.lang) q = q.eq('language', filters.lang);
      if (filters.level) q = q.eq('level', filters.level);
      if (filters.hsk) q = q.eq('hsk_level', filters.hsk);
      if (filters.topic) q = q.eq('topic_slug', filters.topic);
      if (favIds) q = q.in('id', favIds);
      if (filters.q) {
        const s = escapeSearch(filters.q);
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
      }
      const from = pageParam * PAGE_SIZE;
      const { data, count, error } = await q
        .order('language')
        .order('hsk_level', { ascending: true, nullsFirst: false })
        .order('title')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data, total: count ?? 0, page: pageParam };
    },
    getNextPageParam: (last) => ((last.page + 1) * PAGE_SIZE < last.total ? last.page + 1 : undefined),
  });
}

const uuid = z.string().uuid();

export function useLesson(id: string | undefined) {
  const valid = uuid.safeParse(id).success;
  return useQuery({
    queryKey: libraryKeys.lesson(id ?? ''),
    enabled: valid,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('lesson_catalog').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data; // null → not found (or not published)
    },
    // An invalid id is simply "not found"; avoid a pointless request.
    ...(valid ? {} : { initialData: null }),
  });
}

export function useLessonSentences(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.sentences(id ?? ''),
    enabled: enabled && uuid.safeParse(id).success,
    queryFn: async (): Promise<Sentence[]> => {
      const { data, error } = await getSupabase()
        .from('lesson_sentences')
        .select('id, position, text, pinyin, translation_vi, difficulty')
        .eq('lesson_id', id!)
        .order('position');
      if (error) throw error;
      return data;
    },
  });
}

export function useFavoriteIds() {
  const user = useUser();
  return useQuery({
    queryKey: libraryKeys.favorites(user.id),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('favorites').select('lesson_id');
      if (error) throw error;
      return new Set(data.map((r) => r.lesson_id));
    },
  });
}

/** Optimistic: the heart flips immediately and rolls back if the request fails. */
export function useToggleFavorite() {
  const user = useUser();
  const qc = useQueryClient();
  const key = libraryKeys.favorites(user.id);

  return useMutation({
    // Run toggles one after another so a quick double-click can't reach the server out of order.
    scope: { id: 'favorites' },
    mutationFn: async ({ lessonId, favorite }: { lessonId: string; favorite: boolean }) => {
      const sb = getSupabase();
      const { error } = favorite
        ? await sb.from('favorites').upsert({ user_id: user.id, lesson_id: lessonId }, { ignoreDuplicates: true })
        : await sb.from('favorites').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
      if (error) throw error;
    },
    onMutate: async ({ lessonId, favorite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      const next = new Set(previous);
      if (favorite) next.add(lessonId);
      else next.delete(lessonId);
      qc.setQueryData(key, next);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useProgressMap() {
  const user = useUser();
  return useQuery({
    queryKey: libraryKeys.progress(user.id),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('user_lesson_progress')
        .select('lesson_id, status, finished_sentences, last_sentence_position, last_studied_at, avg_accuracy');
      if (error) throw error;
      return new Map(data.filter((r) => r.lesson_id).map((r) => [r.lesson_id!, r as LessonProgress]));
    },
  });
}
