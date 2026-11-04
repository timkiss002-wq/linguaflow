import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/errors';
import { updatePassword } from './api';
import { newPasswordSchema, type NewPasswordValues } from './schemas';

/** New password + confirmation; used by "reset password" and "change password". */
export function NewPasswordForm({ onDone, submitLabel = 'Save new password' }: { onDone: () => void; submitLabel?: string }) {
  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const mutation = useMutation({
    mutationFn: (v: NewPasswordValues) => updatePassword(v.password),
    onSuccess: () => {
      form.reset();
      onDone();
    },
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
      <FormField label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, with letters and numbers." error={errors.password?.message} {...form.register('password')} />
      <FormField label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
