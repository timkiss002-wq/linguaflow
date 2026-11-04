const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extracts the 11-char video id from any common YouTube URL form, or returns null. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (ID_RE.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

export const youtubeThumbnail = (id: string, quality: 'mq' | 'hq' | 'sd' = 'hq') => `https://i.ytimg.com/vi/${id}/${quality}default.jpg`;
export const youtubeWatchUrl = (id: string, startSeconds?: number) =>
  `https://www.youtube.com/watch?v=${id}${startSeconds ? `&t=${Math.floor(startSeconds)}s` : ''}`;
