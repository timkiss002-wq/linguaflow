import { compareChinese } from '@/lib/compare/chinese';
import { compareEnglish } from '@/lib/compare/english';

/**
 * The "Check" column: TRUE when the retyped word matches the saved word.
 * Like =IF(C3=G3; TRUE; FALSE) in Google Sheets it ignores letter case, and it also forgives extra
 * spaces, curly apostrophes and punctuation. Blank → FALSE.
 */
export function reviewCheck(term: string, input: string, language: 'en' | 'zh'): boolean {
  if (!input.trim()) return false;
  const opts = { ignorePunctuation: true };
  return (language === 'zh' ? compareChinese(term, input, opts) : compareEnglish(term, input, opts)).isCorrect;
}
