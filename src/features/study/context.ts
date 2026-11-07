import { createContext, useContext } from 'react';

export type StudyLanguage = 'en' | 'zh';

export interface StudyLanguageState {
  /** what the learner studies today: the whole app shows only this language */
  lang: StudyLanguage;
  setLang: (l: StudyLanguage) => void;
  /** chosen today (the daily "what do you study today?" question was answered) */
  chosenToday: boolean;
}

export const StudyLanguageContext = createContext<StudyLanguageState>({ lang: 'en', setLang: () => {}, chosenToday: true });

export const useStudyLanguage = () => useContext(StudyLanguageContext);

/** flag: a short badge (flag emoji show as letters on Windows, so plain text is used). */
export const STUDY_LABEL: Record<StudyLanguage, { name: string; native: string; flag: string; blurb: string }> = {
  en: { name: 'Tiếng Anh', native: 'English', flag: 'EN', blurb: 'IELTS Reading · Listening · Writing, ngữ pháp, từ vựng, bài nghe' },
  zh: { name: 'Tiếng Trung', native: '中文', flag: '中', blurb: 'Bài nghe HSK, chữ Hán & pinyin, từ vựng, viết tiếng Trung' },
};

const KEY = 'study:lang';
const DAY_KEY = 'study:chosen-on';
export const todayKey = () => new Date().toLocaleDateString('en-CA');

export function readStored(): { lang: StudyLanguage | null; chosenOn: string | null } {
  try {
    const l = localStorage.getItem(KEY);
    return { lang: l === 'en' || l === 'zh' ? l : null, chosenOn: localStorage.getItem(DAY_KEY) };
  } catch {
    return { lang: null, chosenOn: null };
  }
}

export function store(lang: StudyLanguage) {
  try {
    localStorage.setItem(KEY, lang);
    localStorage.setItem(DAY_KEY, todayKey());
  } catch {
    /* private mode */
  }
}
