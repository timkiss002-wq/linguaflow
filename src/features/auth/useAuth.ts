import { useContext } from 'react';
import { AuthContext, type AuthState } from './AuthContext';

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For pages behind <RequireAuth>, where a user is guaranteed. */
export function useUser() {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called outside a protected route');
  return user;
}
