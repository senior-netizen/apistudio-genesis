import { useState } from 'react';
import { Button, Card } from '@sdl/ui';
import { BillingApi } from '../../lib/api/billing';
import { apiFetch } from '../../lib/api/client';
import { useBetaFlags } from './useBetaFlags';

const categories = [
  { value: 'UX', label: 'User Experience' },
  { value: 'BUG', label: 'Bug' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'PAYMENTS', label: 'Payments' },
  { value: 'OTHER', label: 'Other' },
];

const severities = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function FeedbackWidget() {
  const { flags } = useBetaFlags();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('UX');
  const [severity, setSeverity] = useState('MINOR');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!flags.isBeta) {
    return null;
  }

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setCategory('UX');
    setSeverity('MINOR');
  };

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const security = await BillingApi.getPaymentSecurityContext();
      const response = await apiFetch('/v1/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': security.csrfToken,
        },
        body: JSON.stringify({
          title,
          message,
          category,
          severity,
          meta: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Unable to submit feedback');
      }
      setSuccess('Feedback submitted. Thank you for helping us improve!');
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-2">
      {open ? (
        <Card className="w-[360px] space-y-4 border border-border/60 bg-background/95 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Beta feedback</h3>
              <p className="text-xs text-muted">Share bugs, polish ideas, or feature requests.</p>
            </div>
            <Button variant="ghost" size="xs" onClick={close}>
              Close
            </Button>
          </div>
          <form className="space-y-3" onSubmit={submitFeedback}>
            <label className="flex flex-col gap-1 text-sm">
              <span>Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm"
                required
                maxLength={120}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[120px] w-full rounded border border-border/60 bg-background px-2 py-2 text-sm"
                required
                maxLength={4000}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span>Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded border border-border/60 bg-background px-2 py-1 text-sm"
                >
                  {categories.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>Severity</span>
                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                  className="rounded border border-border/60 bg-background px-2 py-1 text-sm"
                >
                  {severities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-500">{success}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit feedback'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        {open ? 'Feedback open' : 'Send beta feedback'}
      </Button>
    </div>
  );
}
