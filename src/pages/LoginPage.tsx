import { Link, useLocation } from 'react-router-dom';
import { LoginForm } from '@/features/auth/LoginForm';
import { AuthLayout } from './AuthLayout';

export default function LoginPage() {
  const { search } = useLocation();
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your practice."
      footer={
        <>
          New to LinguaFlow?{' '}
          <Link to={`/register${search}`} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
