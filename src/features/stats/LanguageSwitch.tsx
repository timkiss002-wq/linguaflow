import type { StatsLanguage } from './api';

/**
 * Was an All / English / 中文 switch on each page. The language is now chosen once for the whole app
 * ("Hôm nay học" in the top bar), so this renders nothing; kept so pages need no special case.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LanguageSwitch(_props: { value: StatsLanguage; onChange: (l: StatsLanguage) => void }) {
  return null;
}
