import { useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import type { Language } from './api';
import { WordCard } from './WordCard';

export interface LookupTarget {
  word: string;
  element: HTMLElement;
  sentence: string;
  sentenceTranslation?: string | null;
  lessonId?: string;
  sentenceId?: string;
}

/** One popover per sentence list; open it with `open(target)` from any clicked word. */
export function useWordLookup(language: Language) {
  const [target, setTarget] = useState<LookupTarget | null>(null);
  const popover = (
    <Popover open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
      {target && <PopoverAnchor virtualRef={{ current: target.element }} />}
      <PopoverContent className="w-[min(92vw,360px)]" onOpenAutoFocus={(e) => e.preventDefault()}>
        {target && <WordCard key={target.word + target.sentence} target={target} language={language} onDone={() => setTarget(null)} />}
      </PopoverContent>
    </Popover>
  );
  return { open: setTarget, popover };
}

