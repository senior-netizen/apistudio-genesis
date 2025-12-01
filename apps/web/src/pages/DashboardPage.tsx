import { Activity, BarChart3, LayoutDashboard, Layers, PenSquare, Sparkles } from 'lucide-react';
import { useState } from 'react';
import PerformanceDashboard from '../components/PerformanceDashboard';
import LiveSessionIndicator from '../components/LiveSessionIndicator';
import AIRequestComposer from '../components/AIRequestComposer';
import GlobalActionBar from '../components/GlobalActionBar';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';
import { AppHeader, PageCard, MetricsBadge, NeonTabBar } from '../components/system';
import LoadingSpinner from '../components/system/LoadingSpinner';

export default function DashboardPage() {
  const { requestPrefill, lastRecordedResponse } = useNavigationFlows();
  const [activePanel, setActivePanel] = useState<'overview' | 'compose' | 'metrics'>('overview');

  return (
    <section className="space-y-6 page-fade-in">
      <div className="space-y-4">
        <NeonTabBar
          tabs={[
            {
              id: 'overview',
              label: 'Dashboard',
              icon: <LayoutDashboard className="h-4 w-4" aria-hidden />,
              active: activePanel === 'overview',
              onSelect: () => setActivePanel('overview'),
            },
            {
              id: 'compose',
              label: 'Compose',
              icon: <PenSquare className="h-4 w-4" aria-hidden />,
              active: activePanel === 'compose',
              onSelect: () => setActivePanel('compose'),
            },
            {
              id: 'metrics',
              label: 'Performance',
              icon: <BarChart3 className="h-4 w-4" aria-hidden />,
              active: activePanel === 'metrics',
              onSelect: () => setActivePanel('metrics'),
              badge: 'Live',
            },
          ]}
        />

        {activePanel === 'overview' && (
          <>
            <GlobalActionBar />
            <div className="grid gap-4 md:grid-cols-3">
              <PageCard
                title="Projects"
                subtitle="Navigate /projects"
                actions={<MetricsBadge label="LIVE" tone="accent" pulsate />}
              >
                <div className="flex items-start gap-3 text-muted">
                  <div className="rounded-[12px] bg-[#6C4DFF]/15 p-3 text-[#d8d0ff] shadow-soft">
                    <Layers className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="text-sm text-muted">
                    Jump straight into the workspace collections and create new requests with a single click.
                  </p>
                </div>
              </PageCard>
              <PageCard title="AI assistant" subtitle="Navigate /ai">
                <div className="flex items-start gap-3 text-muted">
                  <div className="rounded-[12px] bg-[#6C4DFF]/15 p-3 text-[#d8d0ff] shadow-soft">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted">Last suggestion:</p>
                    <p className="text-sm font-semibold text-foreground">
                      {requestPrefill?.prompt ?? 'Awaiting your next prompt.'}
                    </p>
                  </div>
                </div>
              </PageCard>
              <PageCard title="Latest response" subtitle="Navigate /requests/:id/response">
                <div className="flex items-start gap-3 text-muted">
                  <div className="rounded-[12px] bg-[#6C4DFF]/15 p-3 text-[#d8d0ff] shadow-soft">
                    <Activity className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {lastRecordedResponse
                      ? `Response ${lastRecordedResponse.responseId} from request ${lastRecordedResponse.requestId}`
                      : 'Send a request to view rich telemetry.'}
                  </p>
                </div>
              </PageCard>
            </div>
          </>
        )}

        {activePanel === 'compose' && (
          <PageCard
            title="Compose from dashboard"
            subtitle="Draft a prompt directly from the overview to pre-fill the request builder."
            actions={<LoadingSpinner label="Autosave enabled" size="sm" />}
          >
            <div className="mt-2">
              <AIRequestComposer onCompose={(prompt) => console.info('Dashboard prompt', prompt)} />
            </div>
          </PageCard>
        )}

        {activePanel === 'metrics' && (
          <PageCard
            title="Performance snapshot"
            subtitle="Live metrics and uptime telemetry refresh in real-time with pulsing status badges."
            actions={<MetricsBadge label="LIVE" tone="accent" pulsate />}
          >
            <PerformanceDashboard />
          </PageCard>
        )}
      </div>
    </section>
  );
}
