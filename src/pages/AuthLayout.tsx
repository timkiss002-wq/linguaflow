import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}
