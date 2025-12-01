import { Button, Card } from '@sdl/ui';
import Loading from '../components/Loading';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';
import { useToast } from '../components/ui/toast';
import { apiFetch } from '../lib/api/client';

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
  const [api, setApi] = useState<HubApi | null>(null);
  const navigate = useNavigate();
  const { recordPurchase } = useNavigationFlows();
  const { push: pushToast } = useToast();
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch(`/v1/hub/apis/${id}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load hub API (${response.status})`);
        }
        const payload = (await response.json()) as HubApi;
        if (active) {
          setApi(payload);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(message);
          pushToast({
            title: 'Unable to load API details',
            description: message,
            variant: 'danger',
            actions: [
              {
                label: 'Retry',
                onClick: () => setRetryKey((value) => value + 1),
              },
            ],
          });
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, pushToast, retryKey]);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error.includes('401')) {
      return 'Session expired — please sign in again to continue.';
    }
    if (error.includes('404')) {
      return 'This API is no longer available in the hub.';
    }
    return error;
  }, [error]);

  if (loading) {
    return <Loading label="details" inCard />;
  }

  if (error || !api) {
    return (
      <Card className="space-y-4 rounded-[18px] border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        <p>{errorMessage ?? 'API not found.'}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => setRetryKey((value) => value + 1)}>
            Retry
          </Button>
          <Button variant="subtle" onClick={() => navigate('/hub')}>
            Back to hub
          </Button>
        </div>
      </Card>
    );
  }

  const handlePurchase = async () => {
    recordPurchase({ hubApiId: api.id, redirectToBilling: true });
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Hub API</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{api.title}</h1>
        <p className="mt-2 text-sm text-muted">{api.description}</p>
      </header>

      <Card className="border border-border/60 bg-background/80 p-5">
        <p className="text-sm text-muted">Monthly price: ${api.priceUsd.toFixed(2)}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">{api.tags.join(', ')}</p>
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


