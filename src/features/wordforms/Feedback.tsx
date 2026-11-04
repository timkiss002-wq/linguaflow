import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { POS_NAME, POS_WITH_ARTICLE, type FormPos, type FormResult } from '@/lib/wordforms';

/** Explains the answer: what was wrong (form vs spelling vs other) and why this form fits. */
export function Feedback({ result, typed, typedPos, answer, answerPos, why }: {
  result: FormResult;
  typed: string;
  typedPos: FormPos | null;
  answer: string;
  answerPos: FormPos;
  why?: string;
}) {
  return (
    <div className={result === 'correct' ? 'rounded-md bg-success/10 p-3 text-sm' : 'rounded-md bg-muted/70 p-3 text-sm'} role="status" data-result={result}>
      {result === 'correct' ? (
        <p className="flex items-center gap-1.5 font-medium text-success">
          <CheckCircle2 className="size-4" /> Correct!
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-1.5">
          <XCircle className="size-4 text-destructive" />
          {result === 'word_form' && typedPos ? (
            <>
              <span>
                <strong>{typed}</strong> is {POS_WITH_ARTICLE[typedPos]} <PosBadge pos={typedPos} /> — this sentence needs the {POS_NAME[answerPos]}:
              </span>
              <strong className="text-success">{answer}</strong> <PosBadge pos={answerPos} />
            </>
          ) : result === 'spelling' ? (
            <>
              Almost — check the spelling: <strong className="text-success">{answer}</strong>
            </>
          ) : (
            <>
              The answer is <strong className="text-success">{answer}</strong> <PosBadge pos={answerPos} />
            </>
          )}
        </p>
      )}
      {why && (
        <p className="mt-1.5 flex gap-1.5 text-muted-foreground">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" /> {why}
        </p>
      )}
    </div>
  );
}
