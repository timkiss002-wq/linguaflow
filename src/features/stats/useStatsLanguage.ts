import { useStudyLanguage } from '@/features/study/context';
import type { StatsLanguage } from './api';

/** Stats follow "Hôm nay học" in the top bar: only the language being studied. */
export function useStatsLanguage(): [StatsLanguage, (l: StatsLanguage) => void] {
  const { lang, setLang } = useStudyLanguage();
  return [lang, (l) => l && setLang(l)];
}
