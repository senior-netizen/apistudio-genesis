import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';

import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-accent/90 via-accent to-accent/80 text-white shadow-soft hover:shadow-glass hover:from-accent/95 hover:to-accent/85 active:brightness-95',
        subtle:
          'bg-white/80 text-foreground border-border/70 shadow-soft hover:bg-white hover:shadow-glass dark:bg-white/10 dark:text-foreground dark:border-white/10 dark:hover:bg-white/15',
        ghost:
          'bg-transparent text-foreground hover:bg-foreground/5 dark:hover:bg-white/10',
        outline:
          'bg-transparent border-border/70 text-foreground border hover:bg-foreground/5 dark:border-white/10'
      },
      size: {
        xs: 'h-8 px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="inline-flex">
        <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
          {children}
        </Comp>
      </motion.div>
    );
  }
);

Button.displayName = 'Button';
