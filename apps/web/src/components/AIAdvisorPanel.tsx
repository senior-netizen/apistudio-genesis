import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Compass, Lightbulb, RefreshCcw, Sparkles } from 'lucide-react';
import { useToast } from './ui/toast';

type AdvisorTip = {
  id: string;
  message: string;
  category: string;
  weight: number;
};

export interface AIAdvisorPanelProps {
  socket?: Pick<WebSocket, 'send'> | null;
  initialTips?: AdvisorTip[];
}

/**
 * AIAdvisorPanel streams optimisation guidance from the backend AI services.
 * The production edition will subscribe to the unified notification channel;
 * for the scaffold we expose a simple polling simulation so pages can render
 * realistic data and iterate on UX flows.
 */
export function AIAdvisorPanel({ socket, initialTips = [] }: AIAdvisorPanelProps) {
  const [tips, setTips] = useState<AdvisorTip[]>(initialTips);
  const { push } = useToast();
  const previousCount = useRef(initialTips.length);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (tips.length === 0) {
        setTips([
          {
            id: 'warm-cache',
            message: 'Cache GET /customers in AfricaEdge Johannesburg to reduce latency by 35%.',
            category: 'performance',
            weight: 0.8,
          },
        ]);
      }
    }, 1200);
    return () => clearTimeout(timeout);
  }, [tips.length]);

  useEffect(() => {
    if (tips.length > previousCount.current) {
      const latest = tips[0];
      push({
        title: 'AI suggestion ready',
        description: latest?.message ?? 'The AI advisor prepared a new recommendation.',
        tone: 'success',
        channel: 'ai',
        confetti: true,
        actions: [
          {
            label: 'Open in builder',
            onClick: () => window.dispatchEvent(new CustomEvent('squirrel-open-builder')),
          },
        ],
      });
    }
    previousCount.current = tips.length;
  }, [push, tips]);

  const handleRequestRefresh = () => {
    const payload = JSON.stringify({ type: 'REQUEST_TIPS' });
    socket?.send?.(payload);
  };

  const curatedResources = useMemo(
    () => [
      {
        id: 'collections-observability',
        title: 'Observability starter collection',
        description: 'Monitor latency, error budgets, and streaming logs with prebuilt queries.',
      },
      {
        id: 'api-realtime-pipelines',
        title: 'Realtime pipelines API',
        description: 'Deploy websocket powered event streams with region-aware routing.',
      },
    ],
    [],
  );

  return (
    <aside className="space-y-5 rounded-[18px] border border-border/60 bg-background/95 p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden /> AI Advisor
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Insights &amp; recommendations</h2>
          <p className="text-sm text-muted">Continuous telemetry turns into suggested optimisations, playbooks, and curated APIs.</p>
        </div>
        <button
          type="button"
          onClick={handleRequestRefresh}
          className="inline-flex items-center gap-2 rounded-[12px] border border-border/60 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-border hover:bg-background/80"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden /> Refresh
        </button>
      </div>

      <div className="space-y-3 rounded-[16px] border border-border/60 bg-background/90 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lightbulb className="h-4 w-4 text-accent" aria-hidden /> Live recommendations
        </div>
        <ul className="space-y-3">
          {tips.map((tip) => (
            <li
              key={tip.id}
              className="flex flex-col gap-2 rounded-[14px] border border-border/60 bg-background/95 px-4 py-3 text-sm text-foreground"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted">
                  {tip.category}
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold">
                    {Math.round(tip.weight * 100)}%
                  </span>
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">{tip.message}</p>
            </li>
          ))}
          {tips.length === 0 && (
            <li className="rounded-[14px] border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted">
              No active recommendations yet. Refresh to query the advisor.
            </li>
          )}
        </ul>
      </div>

      <div className="space-y-4 rounded-[16px] border border-border/60 bg-background/90 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Compass className="h-4 w-4 text-accent" aria-hidden /> Explore linked assets
        </div>
        <ul className="space-y-3">
          {curatedResources.map((resource) => (
            <li key={resource.id} className="flex items-start justify-between gap-3 rounded-[14px] border border-border/60 bg-background/95 px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{resource.title}</p>
                <p className="text-xs text-muted">{resource.description}</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[12px] border border-border/60 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-border hover:bg-background/80"
              >
                Open
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default AIAdvisorPanel;
