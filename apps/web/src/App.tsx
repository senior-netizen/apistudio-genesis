import {
  AppShell,
  Badge,
  Button,
  type CommandAction,
  type SidebarGroup,
} from "@sdl/ui";
import { useCallback, useEffect, useMemo, Suspense, useRef } from "react";
import {
  matchPath,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ContentSkeleton from "./components/ContentSkeleton";
import Loading from "./components/Loading";
import { useAppStore } from "./store";
import { useToast } from "./components/ui/toast";
import { useToastEvents } from "./hooks/useToastEvents";
import { sanitizeErrorMessage } from "./utils/errorSanitizer";

import { BetaBadge } from "./modules/beta/BetaBadge";
import { FeedbackWidget } from "./modules/beta/FeedbackWidget";

import LanguageRegionSelector from "./components/LanguageRegionSelector";
import { ConnectivityIndicator } from "./components/ConnectivityIndicator";

import { BetaFlagsProvider, useBetaFlags } from "./modules/beta/useBetaFlags";
import { NavigationFlowProvider } from "./modules/navigation/NavigationFlowContext";
import { DevToolsManager } from "./modules/devtools/DevToolsManager";

import {
  appRoutes,
  auxiliaryRoutes,
  notFoundRoute,
  type AppRoute,
  type RouteGroup,
} from "./routes/routeConfig";
import { WorkspaceSyncProvider } from "./modules/sync/WorkspaceSyncProvider";
import { useAuth } from "./modules/auth/AuthProvider";
import { can, getEffectiveRole } from "@sdl/frontend/utils/roles";
import { RoleDebugger } from "./components/RoleDebugger";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { ErrorState } from "./components/system";

// ---------------------- ROUTE GROUP ORDER ----------------------
const groupOrder: Array<{ key: RouteGroup; heading: string }> = [
  { key: "Dashboard", heading: "Dashboard" },
  { key: "Build", heading: "Build" },
  { key: "Requests", heading: "Requests" },
  { key: "AI", heading: "AI Assistant" },
  { key: "Analytics", heading: "Analytics" },
  { key: "Billing", heading: "Billing" },
  { key: "Hub", heading: "Hub & Plugins" },
  { key: "Feedback", heading: "Feedback & Beta" },
  { key: "Settings", heading: "Settings & Teams" },
];

function routeIsActive(route: AppRoute, activePath: string) {
  return Boolean(matchPath({ path: route.path, end: false }, activePath));
}

function useSidebarGroups(
  activePath: string,
  navigate: ReturnType<typeof useNavigate>,
  currentUser: { role?: string | null; isFounder?: boolean | null } | null,
) {
  const accessibleRoutes = useMemo(
    () =>
      appRoutes.filter(
        (route) => !route.adminOnly || can(currentUser, "admin"),
      ),
    [currentUser],
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

// ------------------------------------------------------------
// ------------------------- MAIN APP -------------------------
// ------------------------------------------------------------
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const { flags, profile, loading, error } = useBetaFlags();
  const { user, isAuthenticated, logout: logoutUser } = useAuth();

  const { initialize, initialized, initializing } = useAppStore((state) => ({
    initialize: state.initialize,
    initialized: state.initialized,
    initializing: state.initializing,
  }));

  const { push: pushToast } = useToast();
  useToastEvents();

  const lastErrorRef = useRef<string | undefined>();

  const derivedUser = useMemo(
    () => ({
      role: user?.role ?? profile?.role ?? undefined,
      isFounder:
        user?.isFounder ??
        (user?.role === "founder" || profile?.role === "founder"),
    }),
    [profile?.role, user?.isFounder, user?.role],
  );

  const effectiveRole = getEffectiveRole(derivedUser);

  const handleLogout = useCallback(() => {
    void logoutUser();
  }, [logoutUser]);

  const defaultRoute = "/dashboard";
  const normalized = location.pathname.replace(/\/+$/, "") || "/";
  const activePath = normalized === "/" ? defaultRoute : normalized;
  const userDisplayName =
    user?.name?.trim() || user?.email || "Authenticated user";

  // ---------------- Accessible Routes -------------------
  const accessibleRoutes = useMemo(
    () =>
      appRoutes.filter(
        (route) => !route.adminOnly || can(derivedUser, "admin"),
      ),
    [derivedUser],
  );

  const activeRoute =
    accessibleRoutes.find((route) => routeIsActive(route, activePath)) ??
    accessibleRoutes[0] ??
    appRoutes[0];

  // ---------------- Auto-init Store ---------------------
  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  // ---------------- Route Guard -------------------------
  useEffect(() => {
    if (loading) return;

    if (!accessibleRoutes.some((route) => routeIsActive(route, activePath))) {
      navigate(defaultRoute, { replace: true });
    }
  }, [accessibleRoutes, activePath, defaultRoute, loading, navigate]);

  // ---------------- Beta Error Toast --------------------
  useEffect(() => {
    if (!error) {
      lastErrorRef.current = undefined;
      return;
    }
    const safeError = sanitizeErrorMessage(error);
    if (lastErrorRef.current === safeError) return;

    lastErrorRef.current = safeError;
    pushToast({
      title: "Unable to load beta access",
      description: safeError,
      tone: "danger",
      channel: "system",
    });
  }, [error, pushToast]);

  // ---------------- Roles -------------------------------
  const isFounder = effectiveRole === "founder";
  const isAdmin = !isFounder && can(derivedUser, "admin");
  const workspaceBadge = isFounder
    ? "Founder"
    : isAdmin
      ? "Admin"
      : flags?.isBeta
        ? "Beta"
        : "Studio";

  // ---------------- Shortcuts ---------------------------
  const commandActions: CommandAction[] = useMemo(
    () => [
      {
        id: "open-dashboard",
        label: "Go to dashboard",
        shortcut: "D",
        section: "Navigation",
        onSelect: () => navigate("/dashboard"),
      },
      {
        id: "open-requests",
        label: "Open request catalogue",
        shortcut: "R",
        section: "Navigation",
        onSelect: () => navigate("/requests"),
      },
      {
        id: "open-builder",
        label: "Open request builder",
        shortcut: "B",
        section: "Navigation",
        onSelect: () => navigate("/builder"),
      },
      {
        id: "launch-ai",
        label: "Launch AI assistant",
        shortcut: "A",
        section: "Navigation",
        onSelect: () => navigate("/ai"),
      },
      {
        id: "open-watchtower",
        label: "Open Watchtower",
        section: "Navigation",
        onSelect: () => navigate("/watchtower"),
      },
      {
        id: "open-forge",
        label: "Open Forge Designer",
        section: "Navigation",
        onSelect: () => navigate("/forge"),
      },
      {
        id: "open-plugins",
        label: "Open Plugins",
        section: "Navigation",
        onSelect: () => navigate("/plugins"),
      },
      {
        id: "open-pricing",
        label: "View Pricing",
        shortcut: "U",
        section: "Navigation",
        onSelect: () => navigate("/billing/upgrade"),
      },
      {
        id: "open-cloud",
        label: "Open Cloud Hub",
        shortcut: "C",
        section: "Navigation",
        onSelect: () => navigate("/cloud"),
      },
      {
        id: "open-sync",
        label: "Open Squirrel Sync",
        shortcut: "S",
        section: "Navigation",
        onSelect: () => navigate("/sync"),
      },
      {
        id: "open-hub",
        label: "Explore hub marketplace",
        shortcut: "H",
        section: "Navigation",
        onSelect: () => navigate("/hub"),
      },
    ],
    [navigate],
  );

  // ---------------- Breadcrumbs (for toolbar) ------------------
  const breadcrumbs = useMemo(
    () => [
      {
        label: "Home",
        href: defaultRoute,
        onSelect: () => navigate(defaultRoute),
      },
      {
        label: activeRoute?.label ?? "Dashboard",
      },
    ],
    [activeRoute?.label, defaultRoute, navigate],
  );

  // ---------------- TOP ACTION BAR (FIXED) ----------------------
  const topActions = (
    <div className="flex items-center gap-3 whitespace-nowrap overflow-x-auto overflow-y-hidden px-2 py-1">
      <div className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
        {breadcrumbs.map((b, i) => (
          <span
            key={i}
            className={`
        flex items-center gap-1 cursor-pointer 
        transition-colors hover:text-foreground
      `}
            onClick={b.onSelect}
          >
            {b.label}
            {i !== breadcrumbs.length - 1 && (
              <span className="text-muted-foreground/70">/</span>
            )}
          </span>
        ))}
      </div>

      <ConnectivityIndicator />
      {(isFounder || isAdmin) && (
        <Badge
          variant={isFounder ? "success" : "secondary"}
          className="rounded-[10px] px-2.5 py-1 text-[10px] uppercase tracking-[0.25em]"
        >
          {isFounder ? "Founder" : "Admin"}
        </Badge>
      )}

      <BetaBadge />

      <LanguageRegionSelector
        onChange={(selection) =>
          pushToast({
            title: "Workspace locale updated",
            description: `${selection.language.toUpperCase()} · ${selection.region}`,
            tone: "success",
          })
        }
      />

      <Button
        variant="primary"
        size="sm"
        className="h-9 px-3"
        onClick={() => navigate("/sync")}
      >
        Launch Sync
      </Button>

      <Button
        variant="subtle"
        size="sm"
        className="h-9 px-3"
        onClick={() => navigate("/analytics")}
      >
        View Insights
      </Button>

      {isAuthenticated ? (
        <div className="flex items-center gap-2 border border-border/60 bg-background/80 rounded-[14px] px-3 py-1.5 shadow-soft">
          <span className="text-xs uppercase tracking-[0.25em] text-muted">
            Signed In
          </span>
          <span className="font-semibold text-sm">{userDisplayName}</span>
          <Button
            size="sm"
            variant="subtle"
            className="h-8 rounded-full px-3"
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="primary"
          className="h-8 rounded-full px-3"
          onClick={() => navigate("/login")}
        >
          Sign in
        </Button>
      )}
    </div>
  );

  // ---------------- No Announcement Here ------------------------
  const announcement = null;

  // ------------------------ RENDER ------------------------------
  return (
    <NavigationFlowProvider>
      <DevToolsManager
        role={profile?.role}
        betaGroup={flags.group ?? profile?.betaGroup ?? null}
        onNavigate={(path) => navigate(path)}
      >
        <AppShell
          workspaceName="Squirrel Labs"
          workspaceBadge={workspaceBadge}
          sidebarGroups={useSidebarGroups(activePath, navigate, derivedUser)}
          commandActions={commandActions}
          contentKey={activePath}
          announcement={announcement}
          topActions={topActions}
        >
          {import.meta.env.DEV && (
            <RoleDebugger
              user={user ?? null}
              profile={profile ?? null}
              effectiveRole={effectiveRole}
            />
          )}
          {initializing || !initialized ? (
            <ContentSkeleton />
          ) : (
            <ErrorBoundary
              fallback={
                <ErrorState
                  title="View unavailable"
                  description="We could not render this module. Try again or switch routes while we stabilise the workspace."
                  onRetry={() => initialize()}
                />
              }
              onRetry={() => initialize()}
            >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to={defaultRoute} replace />}
                />
                {accessibleRoutes.map((route) => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <Suspense fallback={<Loading label={route.label} />}>
                        {route.element}
                      </Suspense>
                    }
                  />
                ))}
                {auxiliaryRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <Suspense fallback={<Loading />}>
                        {route.element}
                      </Suspense>
                    }
                  />
                ))}
                <Route
                  path={notFoundRoute.path}
                  element={
                    <Suspense fallback={<Loading />}>
                      {notFoundRoute.element}
                    </Suspense>
                  }
                />
              </Routes>
            </ErrorBoundary>
          )}
        </AppShell>
        <FeedbackWidget />
      </DevToolsManager>
    </NavigationFlowProvider>
  );
}

// --------------------------- AUTH WRAPPER ---------------------------
function ProtectedApp() {
  return (
    <BetaFlagsProvider>
      <WorkspaceSyncProvider>
        <AppContent />
      </WorkspaceSyncProvider>
    </BetaFlagsProvider>
  );
}

// ----------------------------- ROOT ---------------------------------
export default function App() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading label="workspace" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SignupPage />
          )
        }
      />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
