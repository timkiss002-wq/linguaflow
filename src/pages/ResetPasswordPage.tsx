import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';
import { useAuth } from '@/features/auth/useAuth';
import { AuthLayout } from './AuthLayout';

/** Opened from the email link: Supabase signs the user in from the URL, then they choose a new password. */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return <FullPageSpinner />;

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={user ? `For ${user.email}` : 'This page is opened from the reset email.'}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {user ? (
        <NewPasswordForm
          onDone={() => {
            toast.success('Password updated');
            navigate('/dashboard', { replace: true });
          }}
        />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Link invalid or expired</AlertTitle>
          <AlertDescription>
            Request a new one on the <Link to="/forgot-password" className="underline">reset page</Link>.
          </AlertDescription>
        </Alert>
      )}
    </AuthLayout>
  );
}
