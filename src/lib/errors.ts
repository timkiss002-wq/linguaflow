import { AuthError, isAuthApiError } from '@supabase/supabase-js';

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Please confirm your email first — check your inbox for the link.',
  user_already_exists: 'An account with this email already exists. Try signing in.',
  email_exists: 'An account with this email already exists. Try signing in.',
  weak_password: 'This password is too weak. Use at least 8 characters with letters and numbers.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  signup_disabled: 'Sign-ups are currently disabled.',
};

/** Turns any thrown value into a short, user-facing sentence. */
export function toUserMessage(error: unknown): string {
  if (error instanceof AuthError || isAuthApiError(error)) {
    const code = (error as AuthError).code;
    if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
    return error.message;
  }
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
