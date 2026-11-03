import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M7 20c3-6 6-6 9 0s6 6 9 0" stroke="white" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M7 13c3-6 6-6 9 0s6 6 9 0" stroke="#99f6e4" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <LogoMark />
      <span className="text-lg">LinguaFlow</span>
    </Link>
  );
}
