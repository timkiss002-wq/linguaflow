import { ClipboardCheck } from 'lucide-react';
import { useStudyLanguage } from '@/features/study/context';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLevelOverview, useStartTest, type Assessment, type SkillRating } from '@/features/assessment/api';
import { SkillLevels } from '@/features/assessment/SkillLevels';
import { useLearner } from '@/features/learner/api';
import { toUserMessage } from '@/lib/errors';
import { checkinDue, CHECKIN_EVERY_DAYS, startLevel } from '@/lib/personal/levels';
import type { Exam } from '@/lib/personal/goals';

const LANG = { en: 'English', zh: '中文' } as const;

export default function LevelTestPage() {
  const overview = useLevelOverview();
  const learner = useLearner();
  const goals = learner.data?.goals ?? [];
  const { lang } = useStudyLanguage();
  const languages: ('en' | 'zh')[] = [lang];

  return (
    <>
      <PageHeader
        title="Kiểm tra trình độ"
        description="Bài kiểm tra ngắn, thích ứng: mỗi câu được chọn theo cách bạn trả lời câu trước, nên nhanh chóng tìm ra trình độ từng kỹ năng."
      />
      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : !overview.data || learner.isPending ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="space-y-4">
          {languages.map((lang) => {
            const goal = goals.find((g) => g.language === lang);
            return (
              <LanguageCard
                key={lang}
                language={lang}
                startAt={startLevel(goal ? { exam: goal.exam as Exam, current_level: goal.current_level } : undefined)}
                ratings={overview.data.ratings.filter((r) => r.language === lang)}
                history={overview.data.history.filter((h) => h.language === lang)}
                tests={overview.data.tests.filter((t) => t.language === lang)}
              />
            );
          })}
          <p className="text-xs text-muted-foreground">
            Levels are estimates from a small question bank (demo, written for LinguaFlow) — useful for choosing lessons, not an official HSK / IELTS result.
          </p>
        </div>
      )}
    </>
  );
}

function LanguageCard({ language, startAt, ratings, history, tests }: { language: 'en' | 'zh'; startAt: number; ratings: SkillRating[]; history: { skill: string; rating: number; assessment_id: string }[]; tests: Assessment[] }) {
  const navigate = useNavigate();
  const start = useStartTest();
  const open = tests.find((t) => !t.finished_at);
  const finished = tests.filter((t) => t.finished_at);
  const last = finished[0];
  const due = checkinDue(last?.finished_at ?? null);
  // the previous test's ratings, to show progress
  const prevId = finished[1]?.id;
  const previous = prevId ? Object.fromEntries(history.filter((h) => h.assessment_id === prevId).map((h) => [h.skill, h.rating])) : undefined;

  const begin = (kind: 'placement' | 'checkin') =>
    start.mutate(
      { language, kind, startLevel: startAt },
      { onSuccess: (id) => navigate(`/level-test/${id}`), onError: (e) => toast.error(toUserMessage(e)) },
    );

  return (
    <Card data-testid={`level-${language}`}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            {LANG[language]}
            {due && !open && <Badge variant="warning">Check-in due</Badge>}
          </CardTitle>
          <CardDescription>
            {open
              ? 'You have a test in progress.'
              : last
                ? `Last test ${new Date(last.finished_at!).toLocaleDateString()} · a ${CHECKIN_EVERY_DAYS}-day check-in keeps your levels up to date.`
                : 'No test yet. The placement test takes about 12 minutes (20 questions).'}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {open ? (
            <Button asChild>
              <Link to={`/level-test/${open.id}`}>Continue test</Link>
            </Button>
          ) : last ? (
            <>
              <Button variant={due ? 'default' : 'outline'} onClick={() => begin('checkin')} disabled={start.isPending}>
                Check-in · 10 questions
              </Button>
              <Button variant="ghost" onClick={() => begin('placement')} disabled={start.isPending}>
                Full test
              </Button>
            </>
          ) : (
            <Button onClick={() => begin('placement')} disabled={start.isPending}>
              <ClipboardCheck className="size-4" aria-hidden />
              Start placement test
            </Button>
          )}
        </div>
      </CardHeader>
      {ratings.length > 0 && finished.length > 0 && (
        <CardContent className="space-y-4">
          <SkillLevels language={language} ratings={ratings} previous={previous} />
          <div>
            <p className="mb-1 text-sm font-medium">Past tests</p>
            <ul className="space-y-1 text-sm">
              {finished.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link to={`/level-test/${t.id}`} className="text-primary hover:underline">
                    {t.kind === 'placement' ? 'Placement test' : 'Check-in'} · {new Date(t.finished_at!).toLocaleDateString()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
