import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/errors';
import { signIn } from './api';
import { safeRedirect } from './redirect';
import { loginSchema, type LoginValues } from './schemas';

export function LoginForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => navigate(safeRedirect(params.get('redirect')), { replace: true }),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{toUserMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}
      <FormField label="Email" type="email" autoComplete="email" autoFocus error={errors.email?.message} {...form.register('email')} />
      <FormField label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...form.register('password')} />
      <div className="-mt-2 text-right">
        <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
