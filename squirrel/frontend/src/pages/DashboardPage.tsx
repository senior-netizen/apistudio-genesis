import { Card } from '@sdl/ui';
import { Activity, Layers, Sparkles } from 'lucide-react';
import PerformanceDashboard from '../components/PerformanceDashboard';
import LiveSessionIndicator from '../components/LiveSessionIndicator';
import AIRequestComposer from '../components/AIRequestComposer';
import GlobalActionBar from '../components/GlobalActionBar';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';

export default function DashboardPage() {
  const { requestPrefill, lastRecordedResponse } = useNavigationFlows();

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Squirrel API Studio</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Navigate projects, requests, and monetisation modules from one control surface. Every card links directly to the
            underlying workspace route so you can flow without friction.
          </p>
        </div>
        <LiveSessionIndicator participants={8} isLive />
      </header>

      <GlobalActionBar />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/60 bg-background/80 p-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-accent" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Projects</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Navigate /projects</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Jump straight into the workspace collections and create new requests with a single click.
          </p>
        </Card>
        <Card className="border border-border/60 bg-background/80 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI assistant</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Navigate /ai</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Last suggestion: {requestPrefill?.prompt ?? 'Awaiting your next prompt.'}
          </p>
        </Card>
        <Card className="border border-border/60 bg-background/80 p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-accent" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Latest response</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Navigate /requests/:id/response</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            {lastRecordedResponse ? `Response ${lastRecordedResponse.responseId} from request ${lastRecordedResponse.requestId}` : 'Send a request to view rich telemetry.'}
          </p>
        </Card>
      </div>

      <Card className="border border-border/60 bg-background/80 p-4">
        <h2 className="text-lg font-semibold text-foreground">Compose from dashboard</h2>
        <p className="mt-2 text-sm text-muted">
          Draft a prompt directly from the overview to pre-fill the request builder.
        </p>
        <div className="mt-4 max-w-2xl">
          <AIRequestComposer onCompose={(prompt) => console.info('Dashboard prompt', prompt)} />
        </div>
      </Card>

      <PerformanceDashboard />
    </section>
  );
}
