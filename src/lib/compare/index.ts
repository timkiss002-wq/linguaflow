import { compareChinese } from './chinese';
import { compareEnglish } from './english';
import type { CompareOptions, CompareResult } from './types';

export * from './types';

export function compareAnswer(language: 'en' | 'zh', expected: string, actual: string, opts: CompareOptions): CompareResult {
  return language === 'zh' ? compareChinese(expected, actual, opts) : compareEnglish(expected, actual, opts);
}
