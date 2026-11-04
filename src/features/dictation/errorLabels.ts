import type { ErrorKind } from '@/lib/compare';

export const ERROR_LABELS: Record<ErrorKind, { label: string; tip: string; tone: 'red' | 'amber' | 'muted' }> = {
  missing: { label: 'Missing', tip: 'You left this out.', tone: 'amber' },
  extra: { label: 'Extra', tip: 'This is not in the sentence.', tone: 'red' },
  misspelled: { label: 'Spelling', tip: 'Close — check the spelling.', tone: 'amber' },
  wrong_word: { label: 'Wrong word', tip: 'A different word — listen again.', tone: 'red' },
  wrong_character: { label: 'Wrong character', tip: 'Same sound, different character (writing mistake).', tone: 'amber' },
  tone: { label: 'Wrong tone', tip: 'Right syllable, different tone.', tone: 'amber' },
  misheard: { label: 'Misheard', tip: 'A different sound — listen again.', tone: 'red' },
  punctuation: { label: 'Punctuation', tip: 'Punctuation differs.', tone: 'muted' },
};
