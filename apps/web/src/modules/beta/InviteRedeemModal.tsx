import { useState } from 'react';
import { Button, Card } from '@sdl/ui';
import { BillingApi } from '../../lib/api/billing';
import { apiFetch } from '../../lib/api/client';
import { useBetaFlags } from './useBetaFlags';

export function InviteRedeemModal() {
  const { flags, refresh } = useBetaFlags();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (flags.isBeta) {
    return null;
  }

  async function redeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const security = await BillingApi.getPaymentSecurityContext();
      const response = await apiFetch('/v1/beta/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': security.csrfToken,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Unable to redeem invite');
      }
      setSuccess('Invite redeemed! Reloading beta access…');
      setCode('');
      await refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to redeem invite');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="subtle" size="sm" onClick={() => setOpen(true)}>
        Enter beta with invite
      </Button>
    );
  }

  return (
    <Card className="w-[320px] space-y-3 border border-border/60 bg-background/95 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Redeem invite</h3>
          <p className="text-xs text-muted">Paste your beta invite code to unlock features.</p>
        </div>
        <Button variant="ghost" size="xs" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      <form className="space-y-3" onSubmit={redeem}>
        <label className="flex flex-col gap-1 text-sm">
          <span>Invite code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded border border-border/60 bg-background px-2 py-1 text-sm uppercase tracking-widest"
            placeholder="XXXX-XXXX"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-500">{success}</p> : null}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Redeeming…' : 'Redeem code'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
