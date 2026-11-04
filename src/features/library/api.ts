import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { escapeSearch, type LibraryFilters } from './filters';

export type VideoSummary = Tables<'video_catalog'>;
export type VideoProgress = Pick<Tables<'user_video_progress'>, 'video_id' | 'status' | 'finished_segments' | 'last_segment_position' | 'last_studied_at' | 'avg_accuracy'>;
export type Segment = Pick<Tables<'video_segments'>, 'id' | 'position' | 'start_time' | 'end_time' | 'text' | 'pinyin' | 'translation_vi' | 'difficulty'>;

export const PAGE_SIZE = 12;

export const libraryKeys = {
  topics: ['topics'] as const,
  videos: (f: LibraryFilters, favIds: string[] | null) => ['videos', f, favIds] as const,
  video: (id: string) => ['video', id] as const,
  segments: (id: string) => ['video', id, 'segments'] as const,
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
export function useVideoCatalog(filters: LibraryFilters, favoriteIds: Set<string> | undefined) {
  const favIds = filters.favoritesOnly ? [...(favoriteIds ?? [])].sort() : null;
  return useInfiniteQuery({
    queryKey: libraryKeys.videos(filters, favIds),
    enabled: !filters.favoritesOnly || favoriteIds !== undefined,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (favIds && favIds.length === 0) return { rows: [] as VideoSummary[], total: 0, page: 0 };
      let q = getSupabase().from('video_catalog').select('*', { count: 'exact' }).eq('is_published', true);
      if (filters.lang) q = q.eq('language', filters.lang);
      if (filters.level) q = q.eq('level', filters.level);
      if (filters.hsk) q = q.eq('hsk_level', filters.hsk);
      if (filters.topic) q = q.eq('topic_slug', filters.topic);
      if (favIds) q = q.in('id', favIds);
      if (filters.q) {
        const s = escapeSearch(filters.q);
        q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,source_name.ilike.%${s}%`);
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

export function useVideo(id: string | undefined) {
  const valid = uuid.safeParse(id).success;
  return useQuery({
    queryKey: libraryKeys.video(id ?? ''),
    enabled: valid,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('video_catalog').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data; // null → not found (or not published)
    },
    // An invalid id is simply "not found"; avoid a pointless request.
    ...(valid ? {} : { initialData: null }),
  });
}

export function useVideoSegments(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.segments(id ?? ''),
    enabled: enabled && uuid.safeParse(id).success,
    queryFn: async (): Promise<Segment[]> => {
      const { data, error } = await getSupabase()
        .from('video_segments')
        .select('id, position, start_time, end_time, text, pinyin, translation_vi, difficulty')
        .eq('video_id', id!)
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
      const { data, error } = await getSupabase().from('favorites').select('video_id');
      if (error) throw error;
      return new Set(data.map((r) => r.video_id));
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
    mutationFn: async ({ videoId, favorite }: { videoId: string; favorite: boolean }) => {
      const sb = getSupabase();
      const { error } = favorite
        ? await sb.from('favorites').upsert({ user_id: user.id, video_id: videoId }, { ignoreDuplicates: true })
        : await sb.from('favorites').delete().eq('user_id', user.id).eq('video_id', videoId);
      if (error) throw error;
    },
    onMutate: async ({ videoId, favorite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      const next = new Set(previous);
      if (favorite) next.add(videoId);
      else next.delete(videoId);
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
        .from('user_video_progress')
        .select('video_id, status, finished_segments, last_segment_position, last_studied_at, avg_accuracy');
      if (error) throw error;
      return new Map(data.filter((r) => r.video_id).map((r) => [r.video_id!, r as VideoProgress]));
    },
  });
}
