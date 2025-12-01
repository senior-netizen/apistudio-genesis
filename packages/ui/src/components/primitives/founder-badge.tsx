import * as React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FounderBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const FounderBadge = React.forwardRef<HTMLSpanElement, FounderBadgeProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-md bg-[linear-gradient(135deg,#ffb347,#ff7746)] px-2 py-0.5 text-[11px] font-medium text-white shadow-[0_0_6px_rgba(255,120,40,0.35)]',
          className,
        )}
        {...props}
      >
        <Shield className="h-3 w-3" aria-hidden />
        <span>{children ?? 'Founder'}</span>
      </span>
    );
  },
);

FounderBadge.displayName = 'FounderBadge';
