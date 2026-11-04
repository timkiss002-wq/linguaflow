import { AlertTriangle, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAddWord, useVocabulary } from '@/features/vocabulary/api';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { FORM_POS, TRAP_INFO, type Family } from '@/lib/wordforms';

/**
 * Word family as a grid: one column per part of speech. Each form can be added to the
 * notebook with one click (keeps the family's meaning and type).
 */
export function FamilyGrid({ family, highlight, compact = false, contextSentence }: {
  family: Family;
  highlight?: string;
  compact?: boolean;
  contextSentence?: string | null;
}) {
  const vocab = useVocabulary();
  const add = useAddWord();
  const saved = new Set(vocab.data?.filter((w) => w.language === 'en').map((w) => w.term_normalized));
  const columns = FORM_POS.map((pos) => ({ pos, members: family.members.filter((m) => m.pos === pos) })).filter((c) => c.members.length);

  return (
    <div className="space-y-2" data-testid="family-grid">
      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        {columns.map(({ pos, members }) => (
          <div key={pos} className="rounded-md border bg-card p-2">
            <PosBadge pos={pos} />
            <ul className="mt-1.5 space-y-1">
              {members.map((m) => {
                const isSaved = saved.has(m.word.toLowerCase());
                const isCurrent = highlight?.toLowerCase() === m.word.toLowerCase();
                return (
                  <li key={m.word + m.pos} className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium', isCurrent && 'text-primary underline decoration-2 underline-offset-2')}>{m.word}</p>
                      {!compact && m.meaning_vi && <p className="text-xs text-muted-foreground">{m.meaning_vi}</p>}
                    </div>
                    {isSaved ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-label={`${m.word} is in your notebook`} />
                    ) : (
                      <button
                        type="button"
                        aria-label={`Add ${m.word} (${pos}) to notebook`}
                        disabled={add.isPending}
                        onClick={() =>
                          add.mutate(
                            { language: 'en', term: m.word, part_of_speech: m.pos, meaning_vi: m.meaning_vi, context_sentence: isCurrent ? (contextSentence ?? null) : null },
                            { onSuccess: () => toast.success(`Added "${m.word}"`), onError: (e) => toast.error(toUserMessage(e)) },
                          )
                        }
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {!compact && (family.note || family.traps.length > 0) && (
        <ul className="space-y-1 text-xs">
          {family.note && (
            <li className="flex gap-1.5 text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> {family.note}
            </li>
          )}
          {family.traps.map((t) => (
            <li key={t} className="flex gap-1.5 text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span>
                <strong className="text-foreground">{TRAP_INFO[t]?.title ?? t}</strong> {TRAP_INFO[t]?.tip}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
