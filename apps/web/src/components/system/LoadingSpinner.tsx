import { cn } from '../../lib/cn';

export interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-10 w-10 border-4',
};

export function LoadingSpinner({ label, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span className={cn('inline-flex rounded-full border-transparent border-t-[#6C4DFF] animate-spin', sizeMap[size])} />
      {label ? <span className="text-sm text-muted">{label}</span> : null}
    </div>
  );
}

export default LoadingSpinner;
