import { Card } from '@sdl/ui';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';
import { useAppStore } from '../store';

export default function ResponseDetailPage() {
  const params = useParams<{ requestId: string }>();
  const { lastRecordedResponse } = useNavigationFlows();
  const { initialize, initialized, history } = useAppStore((state) => ({
    initialize: state.initialize,
    initialized: state.initialized,
    history: state.history,
  }));

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  const responseEntry = useMemo(() => {
    return history.find((entry) => (entry.requestId as string | undefined) === params.requestId);
  }, [history, params.requestId]);

  if (!responseEntry) {
    return (
      <Card className="border border-border/60 bg-background/80 p-6 text-sm text-muted">
        No response recorded for this request yet. Trigger the request from the builder to populate telemetry.
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Response telemetry</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Request {params.requestId}</h1>
        {lastRecordedResponse ? (
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted">
            Matched response id {lastRecordedResponse.responseId}
          </p>
        ) : null}
      </header>

      <Card className="border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold text-foreground">Status</h2>
        <p className="mt-2 text-sm text-muted">{responseEntry.status ?? 'Unknown'} · {responseEntry.duration ?? '—'}ms</p>
      </Card>

      <Card className="border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold text-foreground">Raw payload</h2>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/80 p-4 text-xs text-white">
{JSON.stringify(responseEntry.body ?? {}, null, 2)}
        </pre>
      </Card>
    </section>
  );
}
