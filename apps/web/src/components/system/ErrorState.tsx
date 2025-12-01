import { ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import PageCard from './PageCard';
import LoadingSpinner from './LoadingSpinner';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  busy?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not render this view. Please try again or contact support if the issue persists.',
  actionLabel = 'Retry',
  onRetry,
  icon,
  busy,
}: ErrorStateProps) {
  const Icon = icon ?? <AlertTriangle className="h-6 w-6 text-amber-400" aria-hidden />;

  return (
    <PageCard className="text-center" tone="danger">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-200">
          {Icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-[12px] bg-[#6C4DFF] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C4DFF]/40"
            disabled={busy}
          >
            {busy ? <LoadingSpinner size="sm" /> : <RefreshCcw className="h-4 w-4" aria-hidden />}
            <span>{busy ? 'Recovering…' : actionLabel}</span>
          </button>
        ) : null}
      </div>
    </PageCard>
  );
}

export default ErrorState;
