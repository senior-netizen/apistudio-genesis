import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '@sdl/ui';
import AIAdvisorPanel from '../components/AIAdvisorPanel';

interface HubApiCard {
  id: string;
  title: string;
  description: string;
  priceUsd: number;
  verified: boolean;
  tags: string[];
}

export default function HubExplorePage() {
  const [apis, setApis] = useState<HubApiCard[]>([]);

  useEffect(() => {
    setApis([
      {
        id: 'payments-stack',
        title: 'Payments Stack',
        description: 'Unified Paynow Zimbabwe orchestration for cards, ZIPIT, and Ecocash.',
        priceUsd: 29,
        verified: true,
        tags: ['payments', 'africa'],
      },
      {
        id: 'identity-kit',
        title: 'Identity Kit',
        description: 'JWT auth, Okta federation, and audit trails.',
        priceUsd: 49,
        verified: false,
        tags: ['security'],
      },
    ]);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_minmax(280px,1fr)]">
      <div className="space-y-6">
        <Card className="border border-border/60 bg-background/80 p-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Squirrel Hub · Discover APIs</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Browse premium-first integrations curated for the African market.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apis.map((api) => (
            <Card key={api.id} className="border border-border/50 bg-background/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{api.title}</h2>
                {api.verified && <Badge variant="success" className="text-xs">Verified</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted">{api.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">${api.priceUsd.toFixed(2)}</span>
                <Button asChild size="sm" variant="primary">
                  <Link to={`/hub/${api.id}`}>View details</Link>
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                {api.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5">#{tag}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AIAdvisorPanel />
    </div>
  );
}

