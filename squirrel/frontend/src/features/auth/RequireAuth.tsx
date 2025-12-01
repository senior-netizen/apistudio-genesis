import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loading from '../../components/Loading';
import { useAuthStore } from './useAuthStore';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { user, status, initialized, initializing, error } = useAuthStore((state) => ({
    user: state.user,
    status: state.status,
    initialized: state.initialized,
    initializing: state.initializing,
    error: state.error,
  }));

  if (!initialized || initializing || status === 'loading') {
    return <Loading label="Preparing workspace" />;
  }

  if (!user || status !== 'authenticated') {
    const searchParams = new URLSearchParams();
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    if (redirectTarget && redirectTarget !== '/') {
      searchParams.set('redirect', redirectTarget);
    }
    const to = {
      pathname: '/login',
      search: searchParams.toString(),
    };
    const navState = error ? { authError: error } : undefined;
    return <Navigate to={to} state={navState} replace />;
  }

  return <>{children}</>;
}
