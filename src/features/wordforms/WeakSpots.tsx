import { Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PosBadge } from '@/features/vocabulary/PosBadge';
import { POS_LABEL } from '@/lib/vocab/pos';
import { FORM_POS, POS_WITH_ARTICLE } from '@/lib/wordforms';
import { useWordFormStats } from './api';

/** Strengths and weaknesses from the learner's own answers. */
export function WeakSpots() {
  const stats = useWordFormStats();
  const s = stats.data;
  if (!s || s.total < 5) {
    return (
      <Card className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <Target className="size-5 shrink-0" />
        Do a few exercises — after 5 answers you'll see which forms you mix up most.
      </Card>
    );
  }
  const top = s.confusions[0];
  return (
    <Card className="space-y-4 p-4" data-testid="weak-spots">
      <div className="flex items-baseline justify-between">
        <p className="font-medium">Your word-form profile</p>
        <p className="text-sm text-muted-foreground">
          {Math.round((s.correct / s.total) * 100)}% correct · last {s.total} answers
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FORM_POS.map((pos) => {
          const p = s.byPos[pos];
          const pct = p.total ? Math.round((p.correct / p.total) * 100) : null;
          return (
            <div key={pos} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <PosBadge pos={pos} />
                <span className="tabular-nums text-muted-foreground">{pct === null ? '—' : `${pct}%`}</span>
              </div>
              <Progress value={pct ?? 0} label={`${POS_LABEL[pos]} accuracy`} />
            </div>
          );
        })}
      </div>
      {top && (
        <p className="rounded-md bg-warning/10 p-2.5 text-sm">
          Most common mix-up: you wrote <strong>{POS_WITH_ARTICLE[top.typed]}</strong> where <strong>{POS_WITH_ARTICLE[top.expected]}</strong> was needed ({top.count}×).
        </p>
      )}
    </Card>
  );
}
