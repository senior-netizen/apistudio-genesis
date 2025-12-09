import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../utils/cn';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md border border-transparent text-foreground transition',
  {
    variants: {
      variant: {
        solid: 'bg-foreground text-background hover:bg-foreground/90 shadow-soft',
        outline: 'border-border/70 bg-background hover:bg-foreground/5',
        ghost: 'bg-transparent border-border/60 hover:bg-foreground/5'
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
        lg: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'outline',
      size: 'md'
    }
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        iconButtonVariants({ variant, size }),
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = 'IconButton';
