import { Loader2 } from 'lucide-react';

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
