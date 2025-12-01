import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface SkeletonProps {
  className?: string;
  shimmer?: boolean;
  children?: ReactNode;
}

export function Skeleton({ className, shimmer = true, children }: SkeletonProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-[12px] bg-foreground/10', className)}>
      {shimmer ? <div className="absolute inset-0 animate-[pulse_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" /> : null}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

export default Skeleton;
