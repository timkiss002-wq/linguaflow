import wimpy1 from '../../../content/comics/wimpy-kid-1.json';
import type { WriteItem } from '@/lib/practice/items';

/**
 * Practice built around a comic book the learner reads on paper. The sentences are LinguaFlow's own simple
 * retellings of what happens in each part (no text or pictures from the book), so they fit an A2–B1 learner.
 */
export interface ComicWord {
  t: string;
  p: string;
  m: string;
}
export interface ComicChapter {
  id: string;
  month: string;
  title_vi: string;
  /** cover-art motif (features/passage3/CoverArt) */
  art: string;
  summary_vi: string;
  words: ComicWord[];
  translate: { vi: string; en: string[]; hint?: string; scene?: string }[];
  gap: { s: string; base: string; a: string[]; why?: string }[];
}
export interface ComicBook {
  id: string;
  title: string;
  note_vi: string;
  level: string;
  chapters: ComicChapter[];
}

export const COMICS: ComicBook[] = [wimpy1 as ComicBook];

export const comicById = (id: string) => COMICS.find((b) => b.id === id);
export const chapterOf = (book: ComicBook, id: string) => book.chapters.find((c) => c.id === id);

export type ComicKind = 'dich' | 'loai-tu';
export const KIND_LABEL: Record<ComicKind, string> = { dich: 'Dịch câu Việt → Anh', 'loai-tu': 'Điền loại từ' };

/** Results are stored with the other practice scores, under this key. */
export const resultKey = (book: string, chapter: string, kind: ComicKind) => `comic:${book}:${chapter}:${kind}`;

export function translateItems(c: ComicChapter): WriteItem[] {
  return c.translate.map((x, i) => ({ key: `t${i}`, prompt: x.vi, en: x.en, hint: x.hint, scene: x.scene, label: `Câu ${i + 1}` }));
}

/** Gap sentences shown as in the Word form drills: the blank, then the word to change in brackets. */
export function gapItems(c: ComicChapter): WriteItem[] {
  return c.gap.map((g, i) => ({ key: `g${i}`, prompt: `${g.s} (${g.base})`, en: g.a, why: g.why, label: g.base }));
}
