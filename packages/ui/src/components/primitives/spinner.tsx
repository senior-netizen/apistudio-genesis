import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  const dim = size === 'sm' ? 16 : size === 'lg' ? 32 : 20;
  return (
    <div className={cn('inline-flex items-center justify-center', className)} {...props}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        className="animate-spin text-foreground/60"
        aria-label="Loading"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
      </svg>
    </div>
  );
}

