import { getSupabase } from '@/lib/supabase';
import type { LoginValues, RegisterValues } from './schemas';

export async function signIn({ email, password }: LoginValues) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Returns `needsConfirmation: true` when the project requires email confirmation
 * (Supabase then returns no session until the link is clicked).
 */
export async function signUp({ displayName, email, password }: RegisterValues) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });
  if (error) throw error;
  // Supabase hides "already registered" when confirmations are on: it returns a user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    throw Object.assign(new Error('An account with this email already exists. Try signing in.'), {
      name: 'EmailTaken',
    });
  }
  return { needsConfirmation: !data.session };
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
