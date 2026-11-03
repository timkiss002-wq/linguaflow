import { Link } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { AuthLayout } from './AuthLayout';

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free. Your progress and vocabulary stay private to you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
