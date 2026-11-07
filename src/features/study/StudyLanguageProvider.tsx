import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { StudyLanguageContext, readStored, store, todayKey, type StudyLanguage } from './context';

/** Holds the language being studied (English or Chinese), remembered on this device. */
export function StudyLanguageProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readStored, []);
  const [lang, setState] = useState<StudyLanguage>(initial.lang ?? 'en');
  const [chosenOn, setChosenOn] = useState(initial.chosenOn);
  const setLang = useCallback((l: StudyLanguage) => {
    store(l);
    setChosenOn(todayKey());
    setState(l);
  }, []);
  const value = useMemo(() => ({ lang, setLang, chosenToday: chosenOn === todayKey() }), [lang, setLang, chosenOn]);
  return <StudyLanguageContext.Provider value={value}>{children}</StudyLanguageContext.Provider>;
}
