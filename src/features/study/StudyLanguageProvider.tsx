import { useMemo, type ReactNode } from 'react';
import { StudyLanguageContext } from './context';

/**
 * LinguaFlow now teaches English only (the IELTS path). The study-language context stays so the shared code that
 * still reads it keeps working; it is always English.
 */
export function StudyLanguageProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ lang: 'en' as const, setLang: () => {}, chosenToday: true }), []);
  return <StudyLanguageContext.Provider value={value}>{children}</StudyLanguageContext.Provider>;
}
