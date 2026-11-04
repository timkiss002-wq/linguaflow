import { ArrowLeft, Keyboard } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useVocabulary } from '@/features/vocabulary/api';
import { buildQueue } from '@/features/vocabulary/typing';
import { TypingPractice } from '@/features/vocabulary/TypingPractice';

export default function VocabularyPracticePage() {
  const vocab = useVocabulary();
  const [params] = useSearchParams();
  const [round, setRound] = useState(0);
  const lang = params.get('lang');
  const ids = params.get('ids')?.split(',').filter(Boolean);

  const back = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
      <Link to="/vocabulary">
        <ArrowLeft /> Notebook
      </Link>
    </Button>
  );

  if (vocab.isError) return (<>{back}<ErrorState error={vocab.error} onRetry={() => vocab.refetch()} /></>);
  if (vocab.isPending) return (<>{back}<Skeleton className="mx-auto h-96 max-w-xl" /></>);

  // Explicit ids only on the first round; "Practise more" continues with the normal queue.
  const queue = buildQueue(vocab.data, { ids: round === 0 ? ids : undefined, lang: lang === 'en' || lang === 'zh' ? lang : undefined });

  return (
    <>
      {back}
      <h1 className="sr-only">Typing practice</h1>
      {queue.length === 0 ? (
        <EmptyState
          icon={Keyboard}
          title="Nothing to practise right now"
          description={vocab.data.length === 0 ? 'Save some words first — click any word in a lesson.' : 'Every word has reached the top typing level. They will come back in spaced review.'}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to={vocab.data.length === 0 ? '/lessons' : '/vocabulary'}>{vocab.data.length === 0 ? 'Explore lessons' : 'Back to notebook'}</Link>
            </Button>
          }
        />
      ) : (
        <TypingPractice key={round} queue={queue} onRestart={() => setRound((r) => r + 1)} />
      )}
    </>
  );
}
