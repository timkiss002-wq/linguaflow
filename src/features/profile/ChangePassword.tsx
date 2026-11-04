import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewPasswordForm } from '@/features/auth/NewPasswordForm';

export function ChangePassword() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Choose a new password for signing in.</CardDescription>
      </CardHeader>
      <CardContent className="max-w-md">
        <NewPasswordForm submitLabel="Change password" onDone={() => toast.success('Password changed')} />
      </CardContent>
    </Card>
  );
}
