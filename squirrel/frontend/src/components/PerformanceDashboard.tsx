import { useEffect, useState } from 'react';
import { api } from '../services/api';

export interface PerformanceSnapshot {
  endpointId: string;
  avgLatency: number;
  errorRate: number;
  totalSamples: number;
  recommendations?: string[];
}

export function PerformanceDashboard() {
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [performanceRes, usageRes, errorRes] = await Promise.all([
          api.get('/analytics/performance'),
          api.get('/usage/requests'),
          api.get('/analytics/errors'),
        ]);
        const performance = performanceRes.data ?? [];
        const usage = usageRes.data ?? [];
        const errors = errorRes.data ?? [];

        const mapRecommendation = (record: any) =>
          Array.isArray(record.recommendations)
            ? (record.recommendations as string[])
            : typeof record.recommendation === 'string'
              ? [record.recommendation]
              : [];

        const normalized: PerformanceSnapshot[] = Array.isArray(performance)
          ? performance.map((record: any, index: number) => ({
              endpointId: record.endpointId ?? record.route ?? `endpoint-${index}`,
              avgLatency: Number(record.avgLatency ?? record.latencyMs ?? 0),
              errorRate: Number(record.errorRate ?? record.error_ratio ?? 0),
              totalSamples: Number(record.totalSamples ?? record.count ?? 0),
              recommendations: mapRecommendation(record),
            }))
          : [];

        const usageMap = new Map<string, number>();
        if (Array.isArray(usage)) {
          usage.forEach((item: any) => {
            const key = item.endpointId ?? item.route;
            if (key) {
              usageMap.set(String(key), Number(item.total ?? item.count ?? 0));
            }
          });
        }

        const errorMap = new Map<string, number>();
        if (Array.isArray(errors)) {
          errors.forEach((item: any) => {
            const key = item.endpointId ?? item.route;
            if (key) {
              errorMap.set(String(key), Number(item.rate ?? item.errorRate ?? 0));
            }
          });
        }

        const merged = normalized.map((entry) => ({
          ...entry,
          totalSamples: usageMap.get(entry.endpointId) ?? entry.totalSamples,
          errorRate: errorMap.get(entry.endpointId) ?? entry.errorRate,
        }));

        setSnapshots(merged);
      } catch (err) {
        setError('Unable to load performance metrics');
        setSnapshots([]);
      } finally {
        setLoading(false);
      }
    };

    void loadMetrics();
  }, []);

  return (
    <section className="performance-dashboard">
      <header>
        <h2>Performance Insights</h2>
        <p>Monitor latency, reliability, and AI generated recommendations.</p>
      </header>
      {loading && <p className="text-sm text-muted">Loading performance metrics…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && snapshots.length === 0 && (
        <p className="text-sm text-muted">No traffic recorded yet.</p>
      )}
      <div className="performance-dashboard__grid">
        {snapshots.map((snapshot) => (
          <article key={snapshot.endpointId} className="performance-dashboard__card">
            <h3>{snapshot.endpointId}</h3>
            <ul>
              <li>
                <strong>Avg Latency:</strong> {snapshot.avgLatency.toFixed(0)} ms
              </li>
              <li>
                <strong>Error Rate:</strong> {(snapshot.errorRate * 100).toFixed(2)}%
              </li>
              <li>
                <strong>Total Samples:</strong> {snapshot.totalSamples}
              </li>
            </ul>
            {snapshot.recommendations && (
              <div className="performance-dashboard__recommendations">
                <h4>AI Recommendations</h4>
                <ul>
                  {snapshot.recommendations.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default PerformanceDashboard;
