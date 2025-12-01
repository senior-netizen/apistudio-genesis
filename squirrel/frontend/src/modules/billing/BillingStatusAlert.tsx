interface BillingStatusAlertProps {
  feedback: { kind: 'success' | 'error'; message: string } | null;
  onDismiss?: () => void;
}

export function BillingStatusAlert({ feedback, onDismiss }: BillingStatusAlertProps) {
  if (!feedback) {
    return (
      <span role="status" aria-live="polite" className="sr-only">
        Billing status ready
      </span>
    );
  }

  const role = feedback.kind === 'error' ? 'alert' : 'status';
  const tone = feedback.kind === 'error' ? 'text-destructive' : 'text-primary';
  const background = feedback.kind === 'error' ? 'bg-destructive/10 border-destructive/40' : 'bg-primary/10 border-primary/40';

  return (
    <div
      role={role}
      aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${background} ${tone}`}
    >
      <p className="leading-relaxed">{feedback.message}</p>
      {onDismiss ? (
        <button
          type="button"
          className="text-xs uppercase tracking-[0.3em] text-current transition-opacity hover:opacity-70"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

export default BillingStatusAlert;
