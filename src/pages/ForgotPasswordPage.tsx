import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { FormField } from '@/components/FormField';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/features/auth/api';
import { forgotSchema, type ForgotValues } from '@/features/auth/schemas';
import { toUserMessage } from '@/lib/errors';
import { AuthLayout } from './AuthLayout';

export default function ForgotPasswordPage() {
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });
  const mutation = useMutation({ mutationFn: (v: ForgotValues) => requestPasswordReset(v.email) });

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to choose a new password."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {mutation.isSuccess ? (
        <Alert variant="info">
          <MailCheck />
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>If an account exists for {form.getValues('email')}, a reset link is on its way. It expires in one hour.</AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
          {mutation.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{toUserMessage(mutation.error)}</AlertDescription>
            </Alert>
          )}
          <FormField label="Email" type="email" autoComplete="email" autoFocus error={form.formState.errors.email?.message} {...form.register('email')} />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
