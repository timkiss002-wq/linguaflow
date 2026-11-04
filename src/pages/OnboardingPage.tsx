import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useLearner } from '@/features/learner/api';
import { LearnerWizard } from '@/features/learner/LearnerWizard';
import { useProfile } from '@/features/profile/api';

export default function OnboardingPage() {
  const learner = useLearner();
  const profile = useProfile();
  const navigate = useNavigate();
  if (learner.isError || profile.isError) return <ErrorState error={learner.error ?? profile.error} onRetry={() => (learner.refetch(), profile.refetch())} />;
  if (!learner.data || !profile.data) return <Skeleton className="mx-auto h-96 max-w-2xl" />;
  const editing = Boolean(learner.data.profile?.onboarded_at);

  return (
    <>
      <PageHeader
        title={editing ? 'Learning profile' : `Welcome, ${profile.data.display_name}!`}
        description={editing ? 'Update your goals, interests and study habits.' : 'Two minutes to set up your goals — we use them to pick lessons and plan your practice.'}
      />
      <LearnerWizard
        initial={learner.data}
        dailyGoal={profile.data.daily_goal_minutes}
        onDone={() => navigate('/dashboard', { replace: true })}
        onSkip={editing ? undefined : () => navigate('/dashboard', { replace: true })}
      />
    </>
  );
}
