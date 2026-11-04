import { useEffect, useState } from 'react';

/** True while the media query matches (re-renders on change). */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(query).matches : true);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return matches;
}
