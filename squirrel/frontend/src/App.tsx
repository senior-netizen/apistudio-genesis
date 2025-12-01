import { AppShell, Button, Card, type CommandAction, type SidebarGroup } from '@sdl/ui';
import { useEffect, useMemo, Suspense } from 'react';
import { hasRefreshToken } from './services/api';
import { matchPath, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import ContentSkeleton from './components/ContentSkeleton';
import Loading from './components/Loading';
import { useAppStore } from './store';

import { BetaBadge } from './modules/beta/BetaBadge';
import { FeedbackWidget } from './modules/beta/FeedbackWidget';
import LanguageRegionSelector from './components/LanguageRegionSelector';
import { ConnectivityIndicator } from './components/ConnectivityIndicator';
import UserProfileMenu from './components/UserProfileMenu';
import { BetaFlagsProvider, useBetaFlags } from './modules/beta/useBetaFlags';
import { NavigationFlowProvider } from './modules/navigation/NavigationFlowContext';
import { useProductAnnouncements } from './lib/data/useProductAnnouncements';
import { AnnouncementBanner } from './components/announcement/AnnouncementBanner';
import { useNavigationAnalytics } from './modules/navigation/useNavigationAnalytics';
import { appRoutes, auxiliaryRoutes, notFoundRoute, type AppRoute, type RouteGroup } from './routes/routeConfig';
import { RequireAuth } from './features/auth/RequireAuth';
import { useAuthStore } from './features/auth/useAuthStore';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { CollabProvider } from './modules/collab/CollabProvider';

const groupOrder: Array<{ key: RouteGroup; heading: string }> = [
  { key: 'Dashboard', heading: 'Dashboard' },
  { key: 'Build', heading: 'Build' },
  { key: 'Requests', heading: 'Requests' },
  { key: 'AI', heading: 'AI Assistant' },
  { key: 'Analytics', heading: 'Analytics' },
  { key: 'Billing', heading: 'Billing' },
  { key: 'Hub', heading: 'Hub & Plugins' },
  { key: 'Feedback', heading: 'Feedback & Beta' },
  { key: 'Settings', heading: 'Settings & Teams' },
];

function routeIsActive(route: AppRoute, activePath: string) {
  return Boolean(matchPath({ path: route.path, end: false }, activePath));
}

function useSidebarGroups(activePath: string, navigate: ReturnType<typeof useNavigate>, hasAdminAccess: boolean) {
  const accessibleRoutes = useMemo(
    () => appRoutes.filter((route) => !route.adminOnly || hasAdminAccess),
    [hasAdminAccess],
  );

  return useMemo<SidebarGroup[]>(() => {
    const groups = groupOrder.map(({ key, heading }) => ({
      label: heading,
      items: accessibleRoutes
        .filter((route) => route.group === key)
        .map((route) => ({
          id: route.id,
          label: route.label,
          icon: route.icon,
          href: route.path,
          onSelect: () => navigate(route.path),
          active: routeIsActive(route, activePath),
        })),
    }));
    return groups.filter((g) => g.items.length > 0);
  }, [accessibleRoutes, activePath, navigate]);
}
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { flags, profile, loading } = useBetaFlags();
  const { initialize, initialized, initializing, fetchSubscription } = useAppStore((state) => ({
    initialize: state.initialize,
    initialized: state.initialized,
    initializing: state.initializing,
    fetchSubscription: state.fetchSubscription,
  }));
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated' && Boolean(state.user));
  const hasAdminAccess = profile?.role === 'admin' || profile?.role === 'founder';
  const defaultRoute = '/dashboard';
  const normalized = location.pathname.replace(/\/+$/, '') || '/';
  const activePath = normalized === '/' ? defaultRoute : normalized;

  const accessibleRoutes = useMemo(
    () => appRoutes.filter((route) => !route.adminOnly || hasAdminAccess),
    [hasAdminAccess],
  );
  const activeRoute =
    accessibleRoutes.find((route) => routeIsActive(route, activePath)) ?? accessibleRoutes[0] ?? appRoutes[0];

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  useEffect(() => {
    if (!initialized || !isAuthenticated) {
      return;
    }
    void fetchSubscription();
  }, [fetchSubscription, initialized, isAuthenticated]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!accessibleRoutes.some((route) => routeIsActive(route, activePath))) {
      navigate(defaultRoute, { replace: true });
    }
  }, [accessibleRoutes, activePath, defaultRoute, loading, navigate]);

  useEffect(() => {
    const handler = () => {
      hasRefreshToken().then((had) => {
        if (had) {
          window.alert('Session expired - click to log back in');
        }
      });
    };
    window.addEventListener('squirrel:session-expired', handler);
    return () => {
      window.removeEventListener('squirrel:session-expired', handler);
    };
  }, []);

  useNavigationAnalytics(initialized);

  const sidebarGroups = useSidebarGroups(activePath, navigate, hasAdminAccess);

  const commandActions: CommandAction[] = useMemo(
    () => [
      {
        id: 'open-dashboard',
        label: 'Go to dashboard',
        shortcut: 'D',
        section: 'Navigation',
        onSelect: () => navigate('/dashboard'),
      },
      {
        id: 'open-requests',
        label: 'Open request catalogue',
        shortcut: 'R',
        section: 'Navigation',
        onSelect: () => navigate('/requests'),
      },
      {
        id: 'open-builder',
        label: 'Open request builder',
        shortcut: 'B',
        section: 'Navigation',
        onSelect: () => navigate('/builder'),
      },
      {
        id: 'launch-ai',
        label: 'Launch AI assistant',
        shortcut: 'A',
        section: 'Navigation',
        onSelect: () => navigate('/ai'),
      },
      {
        id: 'open-watchtower',
        label: 'Open Watchtower',
        section: 'Navigation',
        onSelect: () => navigate('/watchtower'),
      },
      {
        id: 'open-forge',
        label: 'Open Forge Designer',
        section: 'Navigation',
        onSelect: () => navigate('/forge'),
      },
      {
        id: 'open-plugins',
        label: 'Open Plugins',
        section: 'Navigation',
        onSelect: () => navigate('/plugins'),
      },
      {
        id: 'open-pricing',
        label: 'View Pricing',
        shortcut: 'U',
        section: 'Navigation',
        onSelect: () => navigate('/billing/upgrade'),
      },
      {
        id: 'open-cloud',
        label: 'Open Cloud Hub',
        shortcut: 'C',
        section: 'Navigation',
        onSelect: () => navigate('/cloud'),
      },
      {
        id: 'open-sync',
        label: 'Open Squirrel Sync',
        shortcut: 'S',
        section: 'Navigation',
        onSelect: () => navigate('/sync'),
      },
      {
        id: 'open-hub',
        label: 'Explore hub marketplace',
        shortcut: 'H',
        section: 'Navigation',
        onSelect: () => navigate('/hub'),
      },
    ],
    [navigate],
  );

  const breadcrumbs = useMemo(
    () => [
      {
        label: 'Home',
        href: defaultRoute,
        onSelect: () => navigate(defaultRoute),
      },
      {
        label: activeRoute?.label ?? 'Dashboard',
      },
    ],
    [activeRoute?.label, defaultRoute, navigate],
  );

  const { announcement, isLoading: announcementLoading, isError: announcementError } = useProductAnnouncements();
  const announcementNode = (
    <AnnouncementBanner announcement={announcement} isLoading={announcementLoading} isError={announcementError} />
  );

  const topActions = (
    <div className="flex flex-wrap items-center gap-3">
      <ConnectivityIndicator />
      <BetaBadge />
      <LanguageRegionSelector onChange={(selection) => console.log('Locale preference', selection)} />
      <Button variant="primary" onClick={() => navigate('/sync')}>
        Launch Sync
      </Button>
      <Button variant="subtle" onClick={() => navigate('/analytics')}>
        View Insights
      </Button>
      <UserProfileMenu />
    </div>
  );

  return (
    <NavigationFlowProvider>
      <AppShell
        workspaceName="Squirrel Labs"
        workspaceBadge={flags.isBeta ? 'Beta' : 'Alpha'}
        sidebarGroups={sidebarGroups}
        commandActions={commandActions}
        topTitle="Squirrel API Studio"
        contentKey={activePath}
        breadcrumbs={breadcrumbs}
        announcement={announcementNode}
        topActions={topActions}
      >
        {initializing || !initialized ? (
          <ContentSkeleton />
        ) : (
          <ErrorBoundary fallback={<Card className="p-4">Something went wrong loading this view.</Card>}>
            <Routes>
              <Route path="/" element={<Navigate to={defaultRoute} replace />} />
              {accessibleRoutes.map((route) => (
                <Route
                  key={route.id}
                  path={route.path}
                  element={<Suspense fallback={<Loading label={route.label} />}>{route.element}</Suspense>}
                />
              ))}
              {auxiliaryRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<Suspense fallback={<Loading />}>{route.element}</Suspense>}
                />
              ))}
              <Route
                path={notFoundRoute.path}
                element={<Suspense fallback={<Loading />}>{notFoundRoute.element}</Suspense>}
              />
            </Routes>
          </ErrorBoundary>
        )}
      </AppShell>
      <FeedbackWidget />
    </NavigationFlowProvider>
  );
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <CollabProvider>
              <BetaFlagsProvider>
                <AppContent />
              </BetaFlagsProvider>
            </CollabProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}





