import * as React from 'react';

import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => (
  <div className={cn('animate-pulse rounded-md bg-muted/60 dark:bg-white/10', className)} {...props} />
);

Skeleton.displayName = 'Skeleton';
