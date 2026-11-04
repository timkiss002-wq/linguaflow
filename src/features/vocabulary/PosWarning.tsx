import { AlertTriangle } from 'lucide-react';
import { useWordFamilyIndex } from '@/features/wordforms/api';
import { POS_LABEL } from '@/lib/vocab/pos';
import { suggestedPos, type FormPos } from '@/lib/wordforms';
import type { VocabWord } from './api';

/** ⚠ when the saved type disagrees with the word-family data; one click fixes it. */
export function PosWarning({ word, onFix }: { word: VocabWord; onFix: (pos: FormPos) => void }) {
  const index = useWordFamilyIndex();
  const suggestion = word.language === 'en' && index ? suggestedPos(index, word.term, word.part_of_speech) : null;
  if (!suggestion) return null;
  return (
    <button
      type="button"
      onClick={() => onFix(suggestion)}
      title={`"${word.term}" is usually a ${POS_LABEL[suggestion]}. Click to change.`}
      aria-label={`Type looks wrong: ${word.term} is usually a ${POS_LABEL[suggestion]}. Change to ${POS_LABEL[suggestion]}`}
      className="inline-flex items-center gap-0.5 rounded bg-warning/15 px-1 py-0.5 text-[11px] font-medium text-warning hover:bg-warning/25"
    >
      <AlertTriangle className="size-3" /> {POS_LABEL[suggestion]}?
    </button>
  );
}
