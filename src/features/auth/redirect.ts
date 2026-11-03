/** Only allow same-origin relative paths, so ?redirect= can't send users to another site. */
export function safeRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) return fallback;
  return decoded;
}
