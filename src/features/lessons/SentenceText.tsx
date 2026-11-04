import type { ReactNode } from 'react';
import { toRubyTokens, type RubyToken } from '@/lib/chinese/pinyin';
import { cn } from '@/lib/utils';
import { splitWords, type Segment } from '@/lib/vocab/words';
import type { Language } from '@/features/library/constants';

interface Props {
  text: string;
  language: Language;
  showPinyin?: boolean;
  pinyinOverride?: string | null;
  className?: string;
  /** When set, every word becomes a button (for the word lookup popup). */
  onWordClick?: (word: string, element: HTMLElement) => void;
}

const wordButton = 'cursor-pointer rounded-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Sentence text; Chinese can show pinyin above each character; words can be clickable. */
export function SentenceText({ text, language, showPinyin, pinyinOverride, className, onWordClick }: Props) {
  const segments = splitWords(text, language);

  const word = (seg: Segment, key: number, content: ReactNode) =>
    onWordClick && seg.isWord ? (
      <button
        key={key}
        type="button"
        className={cn(wordButton, language === 'zh' && 'inline-flex items-end')}
        onClick={(e) => onWordClick(seg.text, e.currentTarget)}
        aria-label={`Look up ${seg.text}`}
      >
        {content}
      </button>
    ) : (
      <span key={key} className={language === 'zh' ? 'inline-flex items-end' : undefined}>
        {content}
      </span>
    );

  if (language !== 'zh') {
    return (
      <span lang="en" className={className}>
        {segments.map((s, i) => word(s, i, s.text))}
      </span>
    );
  }

  if (!showPinyin) {
    return (
      <span lang="zh" className={className}>
        {segments.map((s, i) => word(s, i, s.text))}
      </span>
    );
  }

  // Pinyin is computed for the whole sentence (context matters for 多音字), then sliced per word.
  const tokens = toRubyTokens(text, pinyinOverride);
  let cursor = 0;
  const pieces = segments.map((s) => {
    const n = [...s.text].length;
    const slice = tokens.slice(cursor, cursor + n);
    cursor += n;
    return { seg: s, tokens: slice };
  });

  // Keep punctuation with the word before it so it never starts a line.
  const groups: (typeof pieces)[] = [];
  for (const p of pieces) {
    if (!p.seg.isWord && groups.length && !/^[“‘「『（(《〈【[]/.test(p.seg.text)) groups[groups.length - 1]!.push(p);
    else groups.push([p]);
  }

  return (
    <span lang="zh" className={cn('inline-flex flex-wrap items-end gap-x-0.5 gap-y-1 leading-tight', className)}>
      {groups.map((g, gi) => (
        <span key={gi} className="inline-flex items-end">
          {g.map((p, pi) => word(p.seg, pi, p.tokens.map((t, ti) => <Ruby key={ti} token={t} />)))}
        </span>
      ))}
    </span>
  );
}

function Ruby({ token }: { token: RubyToken }) {
  if (!token.pinyin) return <span>{token.text}</span>;
  return (
    <ruby className="inline-flex flex-col-reverse items-center px-px">
      {token.text}
      <rt className="block pb-0.5 text-[0.62em] font-normal leading-none text-muted-foreground">{token.pinyin}</rt>
    </ruby>
  );
}
