import type { Session, User } from '@supabase/supabase-js';
import { createContext } from 'react';

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the stored session has been restored on first load. */
  loading: boolean;
}

export const AuthContext = createContext<AuthState | null>(null);
