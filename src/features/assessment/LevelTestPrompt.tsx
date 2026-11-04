import { ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLearner } from '@/features/learner/api';
import { checkinDue } from '@/lib/personal/levels';
import { useLevelOverview } from './api';

const LANG = { en: 'English', zh: '中文' } as const;

/** Dashboard nudge: no level test yet, a test left unfinished, or a check-in due. Hidden otherwise. */
export function LevelTestPrompt() {
  const overview = useLevelOverview();
  const learner = useLearner();
  if (!overview.data || !learner.data) return null;
  const languages = learner.data.goals.map((g) => g.language);
  const tests = overview.data.tests;

  const open = tests.find((t) => !t.finished_at);
  const untested = languages.find((l) => !tests.some((t) => t.language === l && t.finished_at));
  const due = languages.find((l) => checkinDue(tests.find((t) => t.language === l && t.finished_at)?.finished_at ?? null));
  const message = open
    ? { text: `Your ${LANG[open.language]} level test is waiting.`, label: 'Continue test', to: `/level-test/${open.id}` }
    : untested
      ? { text: `Find your ${LANG[untested]} level in about 12 minutes — lessons and plans will fit you better.`, label: 'Take the level test', to: '/level-test' }
      : due
        ? { text: `It's been two weeks: a 10-question ${LANG[due]} check-in shows your progress.`, label: 'Start check-in', to: '/level-test' }
        : null;
  if (!message) return null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid="level-test-prompt">
      <p className="flex items-center gap-2 text-sm">
        <ClipboardCheck className="size-4 shrink-0 text-primary" aria-hidden />
        {message.text}
      </p>
      <Button asChild size="sm">
        <Link to={message.to}>{message.label}</Link>
      </Button>
    </Card>
  );
}
