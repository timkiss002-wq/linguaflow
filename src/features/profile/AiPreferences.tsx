import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toUserMessage } from '@/lib/errors';
import { useUpdateProfile, type Profile } from './api';

/** Opt-in for AI writing feedback, which sends texts to Google Gemini. */
export function AiPreferences({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const on = profile.settings.aiFeedback;
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI feedback</CardTitle>
        <CardDescription>Used only when you press “Get AI feedback” on a text you wrote.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="aiFeedback">AI writing feedback (Google Gemini)</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Sends the text and its task to Google Gemini through LinguaFlow's server. On the free tier Google may use it to improve its products — don't include personal information.
            </p>
          </div>
          <Switch
            id="aiFeedback"
            checked={on}
            disabled={update.isPending}
            onCheckedChange={(v) =>
              update.mutate({ settings: { ...profile.settings, aiFeedback: v } }, { onSuccess: () => toast.success(v ? 'AI feedback on' : 'AI feedback off'), onError: (e) => toast.error(toUserMessage(e)) })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
