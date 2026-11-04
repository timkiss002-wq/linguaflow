import { RotateCcw, Trophy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { toUserMessage } from '@/lib/errors';
import type { FamilyIndex } from '@/lib/wordforms';
import { useRecordWordForm, type WordFormAttempt } from './api';
import { GridItem, SortItem, TypeItem } from './Items';
import { EXERCISES, type ExerciseKind, type Item } from './session';

export function ExerciseSession({ kind, items, index, onExit, onAgain }: {
  kind: ExerciseKind;
  items: Item[];
  index: FamilyIndex;
  onExit: () => void;
  onAgain: () => void;
}) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<WordFormAttempt[]>([]);
  const [started] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const record = useRecordWordForm();

  const onAnswer = (attempts: WordFormAttempt[], correct: boolean) => {
    if (correct) setScore((s) => s + 1);
    setMistakes((m) => [...m, ...attempts.filter((a) => a.result !== 'correct')]);
    for (const a of attempts) record.mutate(a, { onError: (e) => toast.error(`Not saved: ${toUserMessage(e)}`) });
  };
  const onNext = () => {
    if (i + 1 >= items.length) setElapsed(Math.round((Date.now() - started) / 1000));
    setI((x) => x + 1);
  };

  if (i >= items.length) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <Trophy className="mx-auto size-8 text-warning" />
        <div>
          <h2 className="text-2xl font-semibold">
            {score} / {items.length}
          </h2>
          <p className="text-muted-foreground">
            {EXERCISES[kind].title}
            {kind === 'sort' && ` · ${elapsed}s`}
          </p>
        </div>
        {mistakes.length > 0 && (
          <Card className="p-4 text-left">
            <p className="mb-2 text-sm font-medium">To review</p>
            <ul className="space-y-1.5 text-sm">
              {mistakes.map((m, k) => (
                <li key={k} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-success">{m.expected}</span>
                  <PosBadge pos={m.expected_pos} />
                  {m.typed && (
                    <span className="text-muted-foreground">
                      — you: <span className="line-through">{m.typed}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="flex justify-center gap-2">
          <Button onClick={onAgain}>
            <RotateCcw /> New set
          </Button>
          <Button variant="outline" onClick={onExit}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const item = items[i]!;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{EXERCISES[kind].title}</span>
        <span>
          {i + 1} / {items.length} · {score} correct
        </span>
      </div>
      <Progress value={(i / items.length) * 100} label="Exercise progress" />
      <Card className="p-6">
        <p className="mb-4 text-sm text-muted-foreground">{EXERCISES[kind].description}</p>
        {item.kind === 'gap' || item.kind === 'fix' ? (
          <TypeItem key={i} item={item} index={index} onAnswer={onAnswer} onNext={onNext} />
        ) : item.kind === 'grid' ? (
          <GridItem key={i} item={item} index={index} onAnswer={onAnswer} onNext={onNext} />
        ) : (
          <SortItem key={i} item={item} index={index} onAnswer={onAnswer} onNext={onNext} />
        )}
      </Card>
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onExit}>
          Stop
        </Button>
      </div>
    </div>
  );
}
