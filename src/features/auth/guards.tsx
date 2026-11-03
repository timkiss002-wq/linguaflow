import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { safeRedirect } from './redirect';
import { useAuth } from './useAuth';

/** Only signed-in users. Others are sent to /login and brought back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}

/** Login/register pages: signed-in users go straight to the app. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={safeRedirect(new URLSearchParams(location.search).get('redirect'))} replace />;
  return <>{children}</>;
}
