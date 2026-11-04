import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { reviewCheck } from '@/lib/vocab/check';
import { useUpdateWord, type VocabWord } from './api';

/** "Ôn từ vựng": always-editable cell like in the sheet. Saves on Enter or when leaving the cell. */
export function ReviewInput({ word, className }: { word: VocabWord; className?: string }) {
  const update = useUpdateWord();
  const [value, setValue] = useState(word.review_input);
  const composing = useRef(false);
  const lang = word.language === 'zh' ? 'zh' : 'en';

  useEffect(() => setValue(word.review_input), [word.review_input]);

  const save = () => {
    const v = value.trim().slice(0, 300);
    if (v === word.review_input) return;
    update.mutate(
      { id: word.id, patch: { review_input: v, review_correct: reviewCheck(word.term, v, lang) } },
      { onError: (e) => toast.error(toUserMessage(e)) },
    );
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={() => (composing.current = false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !composing.current && !e.nativeEvent.isComposing && e.keyCode !== 229) {
          e.preventDefault();
          save();
          (e.currentTarget.closest('tr, li')?.nextElementSibling?.querySelector('input[data-review]') as HTMLInputElement | null)?.focus();
        }
      }}
      data-review
      lang={lang}
      maxLength={300}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label={`Ôn từ vựng: ${word.term}`}
      placeholder="gõ lại từ…"
      className={cn(
        'w-full min-w-28 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-input focus:border-primary focus:bg-background focus:outline-none',
        className,
      )}
    />
  );
}

/** "Check": TRUE / FALSE, coloured like the sheet. */
export function CheckBadge({ correct }: { correct: boolean }) {
  return (
    <span
      data-check={correct ? 'TRUE' : 'FALSE'}
      className={cn(
        'inline-flex min-w-14 justify-center rounded px-1.5 py-0.5 text-xs font-semibold',
        correct ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive',
      )}
    >
      {correct ? 'TRUE' : 'FALSE'}
    </span>
  );
}
