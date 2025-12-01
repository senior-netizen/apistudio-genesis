import { Button, Card } from '@sdl/ui';
import Loading from '../components/Loading';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';
import { api } from '../services/api';

interface HubApi {
  id: string;
  title: string;
  description: string;
  priceUsd: number;
  tags: string[];
}

export default function HubDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiDetails, setApiDetails] = useState<HubApi | null>(null);
  const navigate = useNavigate();
  const { recordPurchase } = useNavigationFlows();

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api
      .get<HubApi>(`/v1/hub/apis/${id}`)
      .then((response) => {
        if (!active) return;
        setApiDetails(response.data ?? null);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setApiDetails(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <Loading label="details" inCard />;
  }

  if (error || !apiDetails) {
    return (
      <Card className="border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-900 dark:text-red-200">
        {error ?? 'API not found.'}
      </Card>
    );
  }

  const handlePurchase = async () => {
    recordPurchase({ hubApiId: apiDetails.id, redirectToBilling: true });
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Hub API</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{apiDetails.title}</h1>
        <p className="mt-2 text-sm text-muted">{apiDetails.description}</p>
      </header>

      <Card className="border border-border/60 bg-background/80 p-5">
        <p className="text-sm text-muted">Monthly price: ${apiDetails.priceUsd.toFixed(2)}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">{apiDetails.tags.join(', ')}</p>
        <div className="mt-4 flex gap-3">
          <Button variant="primary" onClick={handlePurchase}>
            Purchase access
          </Button>
          <Button variant="subtle" onClick={() => navigate('/hub')}>
            Back to hub
          </Button>
        </div>
      </Card>
    </section>
  );
}
