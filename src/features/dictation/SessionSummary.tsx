import { CheckCircle2, Clock, RotateCcw, Target, XCircle, BookPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SentenceText } from '@/features/lessons/SentenceText';
import type { Sentence } from '@/features/library/api';
import { formatDuration } from '@/lib/format';
import type { SessionSummary as Summary } from './session';

export function SessionSummary({ summary, seconds, wordsSaved, retry, language, lessonId, onRetry, onRestart }: {
  summary: Summary;
  seconds: number;
  wordsSaved: number | undefined;
  retry: Sentence[];
  language: 'en' | 'zh';
  lessonId: string;
  onRetry: () => void;
  onRestart: () => void;
}) {
  const stats = [
    { icon: Target, label: 'Accuracy', value: `${summary.accuracy}%` },
    { icon: CheckCircle2, label: 'Correct', value: summary.correct },
    { icon: XCircle, label: 'Incorrect', value: summary.incorrect },
    { icon: BookPlus, label: 'New words', value: wordsSaved ?? '—' },
    { icon: Clock, label: 'Study time', value: formatDuration(seconds) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Session complete</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You practised {summary.practised} {summary.practised === 1 ? 'sentence' : 'sentences'}.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4 text-center">
            <Icon className="mx-auto size-4 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {retry.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sentences to practise again</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {retry.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className="w-5 shrink-0 text-right text-muted-foreground">{s.position}</span>
                  <div>
                    <SentenceText text={s.text} language={language} />
                    {s.translation_vi && <p className="text-xs text-muted-foreground">{s.translation_vi}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {retry.length > 0 && (
          <Button onClick={onRetry}>
            <RotateCcw /> Practise these {retry.length} again
          </Button>
        )}
        <Button variant="outline" onClick={onRestart}>
          Start the lesson over
        </Button>
        <Button variant="ghost" asChild>
          <Link to={`/lessons/${lessonId}`}>Back to lesson</Link>
        </Button>
      </div>
    </div>
  );
}
