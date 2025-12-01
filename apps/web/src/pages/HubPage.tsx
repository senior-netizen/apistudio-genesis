import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '@sdl/ui';
import AIRequestComposer from '../components/AIRequestComposer';
import LiveSessionIndicator from '../components/LiveSessionIndicator';
import PerformanceDashboard from '../components/PerformanceDashboard';

interface HubApi {
  id: string;
  title: string;
  description: string;
  priceUsd: number;
  verified: boolean;
  tags: string[];
}

export function HubPage() {
  const [apis, setApis] = useState<HubApi[]>([]);

  useEffect(() => {
    // Placeholder data. Replace with real fetch from /hub/apis.
    setApis([
      {
        id: '1',
        title: 'Payments API',
        description: 'Process Paynow Zimbabwe payments with ZIPIT, Ecocash, and card rails.',
        priceUsd: 19,
        verified: true,
        tags: ['payments', 'finance'],
      },
      {
        id: '2',
        title: 'KYC API',
        description: 'Identity verification flows optimized for African markets.',
        priceUsd: 9,
        verified: false,
        tags: ['identity', 'compliance'],
      },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 bg-background/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Marketplace</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Squirrel Hub</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Discover, monetize, and collaborate on production-ready APIs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiveSessionIndicator participants={5} isLive />
            <Badge variant="secondary" className="text-xs">Curated</Badge>
          </div>
        </div>
      </Card>

      <Card className="border border-border/60 bg-background/80 p-6">
        <h2 className="text-lg font-semibold text-foreground">Prompt to API</h2>
        <div className="mt-4">
          <AIRequestComposer onCompose={(prompt) => console.log('Compose request', prompt)} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apis.map((api) => (
          <Card key={api.id} className="border border-border/50 bg-background/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground">{api.title}</h3>
              {api.verified && (
                <Badge variant="success" className="text-xs">Verified</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">{api.description}</p>
            <p className="mt-3 text-sm font-medium text-foreground">${api.priceUsd.toFixed(2)} / month</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              {api.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5">#{tag}</span>
              ))}
            </div>
            <div className="mt-4">
              <Button size="sm" variant="primary">Test in Sandbox</Button>
            </div>
          </Card>
        ))}
      </div>

      <PerformanceDashboard />
    </div>
  );
}

export default HubPage;
