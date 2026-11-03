import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/features/auth/useAuth';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { parseSettings, type LearningSettings, type ProfileValues } from './schemas';

export type Profile = Omit<Tables<'profiles'>, 'settings'> & { settings: LearningSettings };

export const profileKeys = { me: (userId: string) => ['profile', userId] as const };

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return { ...data, settings: parseSettings(data.settings) };
}

export function useProfile() {
  const user = useUser();
  return useQuery({ queryKey: profileKeys.me(user.id), queryFn: () => fetchProfile(user.id) });
}

type ProfilePatch = Partial<ProfileValues> & { settings?: LearningSettings };

export function useUpdateProfile() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const { data, error } = await getSupabase()
        .from('profiles')
        .update({
          display_name: patch.displayName,
          timezone: patch.timezone,
          daily_goal_minutes: patch.dailyGoalMinutes,
          settings: patch.settings,
        })
        .eq('id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      return { ...data, settings: parseSettings(data.settings) } satisfies Profile;
    },
    onSuccess: (profile) => qc.setQueryData(profileKeys.me(user.id), profile),
  });
}
