import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/errors';
import { signUp } from './api';
import { registerSchema, type RegisterValues } from './schemas';

export function RegisterForm() {
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: ({ needsConfirmation }) => {
      if (!needsConfirmation) navigate('/dashboard', { replace: true });
    },
  });
  const { errors } = form.formState;

  if (mutation.isSuccess && mutation.data.needsConfirmation) {
    return (
      <Alert variant="info">
        <MailCheck />
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>
          We sent a confirmation link to <strong>{form.getValues('email')}</strong>. Open it to activate your account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{toUserMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}
      <FormField label="Display name" autoComplete="nickname" autoFocus error={errors.displayName?.message} {...form.register('displayName')} />
      <FormField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
      <FormField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with letters and numbers."
        error={errors.password?.message}
        {...form.register('password')}
      />
      <FormField label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
