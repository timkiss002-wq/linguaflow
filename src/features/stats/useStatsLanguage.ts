import { useSearchParams } from 'react-router-dom';
import type { StatsLanguage } from './api';

/** All / English / 中文, kept in the URL (?lang=). */
export function useStatsLanguage(): [StatsLanguage, (l: StatsLanguage) => void] {
  const [params, setParams] = useSearchParams();
  const v = params.get('lang');
  const lang: StatsLanguage = v === 'en' || v === 'zh' ? v : undefined;
  const set = (l: StatsLanguage) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (l) next.set('lang', l);
        else next.delete('lang');
        return next;
      },
      { replace: true },
    );
  return [lang, set];
}
