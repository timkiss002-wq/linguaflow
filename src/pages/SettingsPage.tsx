import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/features/auth/useAuth';
import { useProfile } from '@/features/profile/api';
import { LearningPreferences } from '@/features/profile/LearningPreferences';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { ReviewPreferences } from '@/features/profile/ReviewPreferences';
import { ChangePassword } from '@/features/profile/ChangePassword';

export default function SettingsPage() {
  const user = useUser();
  const profile = useProfile();

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile and how lessons behave." />
      {profile.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <div className="space-y-6">
          <ProfileForm profile={profile.data} email={user.email ?? ''} />
          <LearningPreferences profile={profile.data} />
          <ReviewPreferences profile={profile.data} />
          <ChangePassword />
        </div>
      )}
    </>
  );
}
