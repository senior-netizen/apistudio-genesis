import { Badge } from '@sdl/ui';
import type { HTMLAttributes } from 'react';
import { useBetaFlags } from './useBetaFlags';

interface BetaBadgeProps extends HTMLAttributes<HTMLSpanElement> {}

export function BetaBadge({ className, ...rest }: BetaBadgeProps) {
  const { flags } = useBetaFlags();
  if (!flags.isBeta) {
    return null;
  }
  const base = 'bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200';
  return (
    <Badge
      variant="outline"
      className={className ? `${base} ${className}` : base}
      {...rest}
    >
      BETA
    </Badge>
  );
}
