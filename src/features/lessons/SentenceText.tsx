import { groupForWrapping, toRubyTokens } from '@/lib/chinese/pinyin';
import { cn } from '@/lib/utils';
import type { Language } from '@/features/library/constants';

/** Sentence text; for Chinese optionally with pinyin above each character. */
export function SentenceText({ text, language, showPinyin, pinyinOverride, className }: {
  text: string;
  language: Language;
  showPinyin?: boolean;
  pinyinOverride?: string | null;
  className?: string;
}) {
  if (language !== 'zh' || !showPinyin) {
    return (
      <span lang={language === 'zh' ? 'zh' : 'en'} className={className}>
        {text}
      </span>
    );
  }
  return (
    // Each character is a small column (pinyin above, character below) so spacing stays even
    // and lines never overlap, unlike native <ruby> layout.
    <span lang="zh" className={cn('inline-flex flex-wrap items-end gap-x-0.5 gap-y-1 leading-tight', className)}>
      {groupForWrapping(toRubyTokens(text, pinyinOverride)).map((group, g) => (
        <span key={g} className="inline-flex items-end">
          {group.map((t, i) =>
            t.pinyin ? (
              <ruby key={i} className="inline-flex flex-col-reverse items-center px-px">
                {t.text}
                <rt className="block pb-0.5 text-[0.62em] font-normal leading-none text-muted-foreground">{t.pinyin}</rt>
              </ruby>
            ) : (
              <span key={i}>{t.text}</span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}
