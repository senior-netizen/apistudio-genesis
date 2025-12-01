import { useEffect, useState } from 'react';

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

  const handleRequestRefresh = () => {
    const payload = JSON.stringify({ type: 'REQUEST_TIPS' });
    socket?.send?.(payload);
  };

  return (
    <aside className="ai-advisor-panel">
      <header className="ai-advisor-panel__header">
        <h2>AI Advisor</h2>
        <button type="button" onClick={handleRequestRefresh}>
          Refresh
        </button>
      </header>
      <ul className="ai-advisor-panel__list">
        {tips.map((tip) => (
          <li key={tip.id} className={`ai-advisor-panel__item ai-advisor-panel__item--${tip.category}`}>
            <span className="ai-advisor-panel__weight">{Math.round(tip.weight * 100)}%</span>
            <p>{tip.message}</p>
          </li>
        ))}
        {tips.length === 0 && <li className="ai-advisor-panel__empty">No active recommendations yet.</li>}
      </ul>
    </aside>
  );
}

export default AIAdvisorPanel;
