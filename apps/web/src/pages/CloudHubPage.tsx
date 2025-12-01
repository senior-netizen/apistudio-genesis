import { Button, Card } from '@sdl/ui';
import { Cloud, Globe2, RefreshCcw, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';

type Cluster = {
  id: number;
  name: string;
  region: string;
  status: 'healthy' | 'degraded';
  connected: boolean;
  endpoints: number;
};

const initialClusters: Cluster[] = [
  { id: 1, name: 'Edge CDN', region: 'Global', status: 'healthy', connected: true, endpoints: 124 },
  { id: 2, name: 'Core API', region: 'us-east-1', status: 'healthy', connected: true, endpoints: 86 },
  { id: 3, name: 'Billing Mesh', region: 'eu-west-2', status: 'degraded', connected: false, endpoints: 42 }
];

export function CloudHubPage() {
  const [clusters, setClusters] = useState(initialClusters);

  const healthyPercentage = useMemo(() => {
    if (!clusters.length) return 0;
    const healthy = clusters.filter((cluster) => cluster.status === 'healthy').length;
    return Math.round((healthy / clusters.length) * 100);
  }, [clusters]);

  const toggleConnection = (id: number) => {
    setClusters((current) =>
      current.map((cluster) =>
        cluster.id === id
          ? {
              ...cluster,
              connected: !cluster.connected,
              status: cluster.connected ? 'degraded' : 'healthy'
            }
          : cluster
      )
    );
  };

  const refreshStatus = () => {
    setClusters((current) =>
      current.map((cluster) =>
        cluster.status === 'degraded'
          ? { ...cluster, status: 'healthy', connected: true }
          : cluster
      )
    );
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Cloud fabric</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Cloud Hub</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Inspect every managed surface. Cloud Hub keeps track of global topology, secure tunnels, and failover posture across
            all delivery regions.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={refreshStatus}>
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
            Refresh health
          </Button>
          <Button variant="subtle">
            <Shield className="mr-2 h-4 w-4" aria-hidden />
            Manage access policies
          </Button>
        </div>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Active clusters</h2>
          </div>
          <span className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted">
            {healthyPercentage}% healthy
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="rounded-xl border border-border/40 bg-white/70 p-4 text-sm shadow-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{cluster.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <Globe2 className="h-3.5 w-3.5" aria-hidden />
                    {cluster.region}
                  </p>
                </div>
                <span
                  className={
                    cluster.status === 'healthy'
                      ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500'
                      : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500'
                  }
                >
                  {cluster.status === 'healthy' ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted">{cluster.endpoints} endpoints</p>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant={cluster.connected ? 'subtle' : 'primary'}
                onClick={() => toggleConnection(cluster.id)}
              >
                {cluster.connected ? 'Disconnect' : 'Reconnect'} tunnel
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default CloudHubPage;
