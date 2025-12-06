import Loading from '../../components/Loading';
import { useEffect, useState } from 'react';
import { Button, Card } from '@sdl/ui';
import { BillingApi } from '../../lib/api/billing';
import { useBetaFlags } from './useBetaFlags';
import { api } from '../../services/api';

interface InviteRecord {
  id: string;
  code: string;
  betaGroup?: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export default function BetaInvitesPage() {
  const { profile } = useBetaFlags();
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [count, setCount] = useState(1);
  const [group, setGroup] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const hasAdminAccess = profile.role === 'admin' || profile.role === 'founder';

  const loadInvites = async () => {
    try {
      setLoading(true);
      const response = await api.get<InviteRecord[]>('/v1/beta/admin/invites', { params: { active: true } });
      const items = Array.isArray(response.data) ? response.data : [];
      setInvites(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load invites');
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      void loadInvites();
    } else {
      setInvites([]);
      setLoading(false);
      setError(null);
    }
  }, [hasAdminAccess]);

  const createInvites = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const security = await BillingApi.getPaymentSecurityContext();
      await api.post(
        '/v1/beta/admin/invites',
        {
          count,
          betaGroup: group || undefined,
          maxUses,
          expiresAt: expiresAt || undefined,
        },
        {
          headers: {
            'x-csrf-token': security.csrfToken,
          },
        },
      );
      await loadInvites();
      setCount(1);
      setMaxUses(1);
      setGroup('');
      setExpiresAt('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create invites');
    } finally {
      setCreating(false);
    }
  };

  if (!hasAdminAccess) {
    return (
      <Card className="mx-auto mt-10 max-w-xl border border-border/60 bg-background/95 p-6 text-center">
        <h2 className="text-lg font-semibold">Elevated access required</h2>
        <p className="mt-2 text-sm text-muted">Only founders or administrators can manage beta invites.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <Card className="border border-border/60 bg-background/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create invites</h2>
        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4" onSubmit={createInvites}>
          <label className="flex flex-col gap-1 text-sm">
            Count
            <input
              type="number"
              min={1}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="rounded border border-border/60 bg-background px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Max uses
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(event) => setMaxUses(Number(event.target.value))}
              className="rounded border border-border/60 bg-background px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Beta group
            <input
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              className="rounded border border-border/60 bg-background px-2 py-1"
              placeholder="payments, ui, ai"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Expires at
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="rounded border border-border/60 bg-background px-2 py-1"
            />
          </label>
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? 'Creating…' : 'Generate invites'}
            </Button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      </Card>

      <Card className="border border-border/60 bg-background/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Active invites</h2>
        {loading ? (
          <Loading label="invites" inCard />
        ) : invites.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No invites available yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Group</th>
                  <th className="pb-2">Usage</th>
                  <th className="pb-2">Expires</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-t border-border/40">
                    <td className="py-2 font-mono text-xs uppercase">{invite.code}</td>
                    <td className="py-2 text-xs">{invite.betaGroup ?? '—'}</td>
                    <td className="py-2 text-xs">
                      {invite.usedCount}/{invite.maxUses}
                    </td>
                    <td className="py-2 text-xs">
                      {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-2 text-xs">{invite.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
