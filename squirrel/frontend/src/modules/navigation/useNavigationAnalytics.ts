import { useEffect } from 'react';
import { getNavigationSummary } from '../../routes/routeConfig';
import { api } from '../../services/api';
import { useAuthStore } from '../../features/auth/useAuthStore';

export function useNavigationAnalytics(enabled: boolean) {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated' && Boolean(state.user));
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const summary = getNavigationSummary();
    void api
      .post('/v1/telemetry/navigation', {
        event: 'navigation-summary',
        summary,
        capturedAt: new Date().toISOString(),
      })
      .catch(() => {
        /* ignore telemetry failures */
      });

    if (import.meta.env.DEV) {
      console.groupCollapsed('[navigation] Route summary');
      console.table(summary);
      console.groupEnd();
    }
  }, [enabled, isAuthenticated]);
}
