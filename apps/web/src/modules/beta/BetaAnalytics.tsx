import Loading from '../../components/Loading';
import { useEffect, useState } from 'react';
import { Card } from '@sdl/ui';
import { apiFetch } from '../../lib/api/client';
import { useBetaFlags } from './useBetaFlags';

interface AnalyticsSummary {
  totals: {
    testers: number;
    feedback: number;
    openFeedback: number;
    resolvedFeedback: number;
  };
  activity: {
    active7: number;
    active30: number;
  };
  feedback: {
    byCategory: Array<{ category: string; count: number }>;
    bySeverity: Array<{ severity: string; count: number }>;
    avgHoursToTriage: number;
    avgHoursToResolve: number;
  };
  adoption: Array<{ group: string | null; testers: number }>;
}

export default function BetaAnalytics() {
  const { profile } = useBetaFlags();
  const isAdmin = profile.role === 'admin';
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const response = await apiFetch('/v1/beta/admin/analytics/summary');
        if (!response.ok) {
          throw new Error(`Failed to load analytics: ${response.status}`);
        }
        const data = await response.json();
        setSummary(data ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load analytics');
      } finally {
        setLoading(false);
      }
    }
    if (isAdmin) {
      void load();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Card className="mx-auto mt-10 max-w-xl border border-border/60 bg-background/95 p-6 text-center">
        <h2 className="text-lg font-semibold">Admin access required</h2>
        <p className="mt-2 text-sm text-muted">Only administrators can view beta analytics.</p>
      </Card>
    );
  }

  if (loading) {
    return <Loading label="analytics" inCard />;
  }

  if (!summary) {
    return (
      <Card className="mx-auto mt-10 max-w-4xl border border-border/60 bg-background/95 p-6 text-sm text-muted">
        {error ?? 'No analytics available yet.'}
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/60 bg-background/95 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Tester totals</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Total testers: {summary.totals.testers}</li>
            <li>Feedback submitted: {summary.totals.feedback}</li>
            <li>Open feedback: {summary.totals.openFeedback}</li>
            <li>Resolved feedback: {summary.totals.resolvedFeedback}</li>
          </ul>
        </Card>
        <Card className="border border-border/60 bg-background/95 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Engagement</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Active testers (7 days): {summary.activity.active7}</li>
            <li>Active testers (30 days): {summary.activity.active30}</li>
            <li>Avg hours to triage: {summary.feedback.avgHoursToTriage}</li>
            <li>Avg hours to resolve: {summary.feedback.avgHoursToResolve}</li>
          </ul>
        </Card>
      </div>
      <Card className="border border-border/60 bg-background/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Feedback breakdown</h2>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">By category</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {summary.feedback.byCategory.map((item) => (
                <li key={item.category} className="flex justify-between">
                  <span>{item.category}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">By severity</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {summary.feedback.bySeverity.map((item) => (
                <li key={item.severity} className="flex justify-between">
                  <span>{item.severity}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
      <Card className="border border-border/60 bg-background/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Group adoption</h2>
        {summary.adoption.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No beta cohorts configured yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {summary.adoption.map((item, index) => (
              <li key={`${item.group ?? 'default'}-${index}`} className="flex justify-between">
                <span>{item.group ?? 'general'}</span>
                <span>{item.testers}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}


