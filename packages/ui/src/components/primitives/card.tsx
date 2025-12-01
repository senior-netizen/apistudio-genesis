import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-xl border border-border/60 bg-white/80 p-6 text-left shadow-soft transition-all dark:border-white/10 dark:bg-white/5',
          elevated && 'hover:-translate-y-0.5 hover:shadow-glass focus-within:shadow-glass',
          'dark:hover:bg-white/10',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
