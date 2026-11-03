import { BookOpen, CalendarCheck, Compass, Flame, Layers, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary } from '@/features/dashboard/api';
import { StatCard } from '@/features/dashboard/StatCard';
import { useProfile } from '@/features/profile/api';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const profile = useProfile();
  const summary = useDashboardSummary();
  const s = summary.data;

  return (
    <>
      <PageHeader
        title={profile.data ? `${greeting(new Date().getHours())}, ${profile.data.display_name}` : 'Dashboard'}
        description={profile.data ? `Daily goal: ${profile.data.daily_goal_minutes} minutes of practice.` : <Skeleton className="h-4 w-48" />}
      />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} title="Could not load your stats" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Learning streak" icon={Flame} loading={summary.isPending} value={s ? `${s.streak} ${s.streak === 1 ? 'day' : 'days'}` : ''} />
          <StatCard label="Words saved" icon={BookOpen} loading={summary.isPending} value={s?.wordsSaved ?? 0} />
          <StatCard label="Due for review" icon={CalendarCheck} loading={summary.isPending} value={s?.dueToday ?? 0} />
          <StatCard label="Videos completed" icon={Trophy} loading={summary.isPending} value={s?.videosCompleted ?? 0} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="size-4 text-primary" /> Pick a video
            </CardTitle>
            <CardDescription>Browse English and Chinese videos by topic and level, then practise sentence by sentence.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/library">Explore videos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary" /> Review your words
            </CardTitle>
            <CardDescription>Words you save while listening come back as flashcards right before you’d forget them.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/review">Open review</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
