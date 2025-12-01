import Loading from '../../components/Loading';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@sdl/ui';
import { BillingApi } from '../../lib/api/billing';
import { apiFetch } from '../../lib/api/client';
import { useBetaFlags } from './useBetaFlags';

type FeedbackStatus = 'OPEN' | 'TRIAGED' | 'RESOLVED' | 'CLOSED';

type FeedbackRecord = {
  id: string;
  title: string;
  message: string;
  category: string;
  severity: string;
  status: FeedbackStatus;
  createdAt: string;
  user?: { email?: string | null; betaGroup?: string | null } | null;
};

const statusColumns: { key: FeedbackStatus; title: string }[] = [
  { key: 'OPEN', title: 'Open' },
  { key: 'TRIAGED', title: 'Triaged' },
  { key: 'RESOLVED', title: 'Resolved' },
  { key: 'CLOSED', title: 'Closed' },
];

export default function BetaFeedbackBoard() {
  const { profile } = useBetaFlags();
  const isAdmin = profile.role === 'admin';
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadFeedback() {
    try {
      setLoading(true);
      const response = await apiFetch('/v1/beta/admin/feedback');
      if (!response.ok) {
        throw new Error(`Failed to load feedback: ${response.status}`);
      }
      const data = await response.json();
      setFeedback(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load feedback');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      void loadFeedback();
    }
  }, [isAdmin]);

  async function updateStatus(id: string, status: FeedbackStatus) {
    setUpdating(id);
    try {
      const security = await BillingApi.getPaymentSecurityContext();
      const response = await apiFetch(`/v1/beta/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': security.csrfToken,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Unable to update feedback');
      }
      await loadFeedback();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update feedback');
    } finally {
      setUpdating(null);
    }
  }

  const grouped = useMemo(() => {
    return statusColumns.map((column) => ({
      column,
      items: feedback.filter((item) => item.status === column.key),
    }));
  }, [feedback]);

  if (!isAdmin) {
    return (
      <Card className="mx-auto mt-10 max-w-xl border border-border/60 bg-background/95 p-6 text-center">
        <h2 className="text-lg font-semibold">Admin access required</h2>
        <p className="mt-2 text-sm text-muted">Only administrators can triage beta feedback.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Beta feedback board</h2>
          <p className="text-sm text-muted">Track and triage tester reports in real time.</p>
        </div>
        <Button variant="subtle" size="sm" onClick={() => loadFeedback()} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? (
        <Loading label="feedback" inCard />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {grouped.map(({ column, items }) => (
            <Card key={column.key} className="flex h-full flex-col border border-border/60 bg-background/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{column.title}</h3>
                <span className="text-xs text-muted">{items.length}</span>
              </div>
              <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-sm text-muted">Nothing here yet.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="rounded border border-border/50 bg-background/80 p-3 text-sm">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-muted">{item.message}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>{item.severity}</span>
                        {item.user?.betaGroup ? (
                          <>
                            <span>•</span>
                            <span>{item.user.betaGroup}</span>
                          </>
                        ) : null}
                        {item.user?.email ? (
                          <>
                            <span>•</span>
                            <span>{item.user.email}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {statusColumns
                          .filter((option) => option.key !== item.status)
                          .map((option) => (
                            <Button
                              key={option.key}
                              size="xs"
                              variant="ghost"
                              disabled={updating === item.id}
                              onClick={() => updateStatus(item.id, option.key)}
                            >
                              Mark {option.title.toLowerCase()}
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


