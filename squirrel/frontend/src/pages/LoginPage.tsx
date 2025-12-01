import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '@sdl/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../features/auth/useAuthStore';

function resolveRedirect(searchParams: URLSearchParams): string {
  const redirect = searchParams.get('redirect');
  if (redirect && redirect.startsWith('/')) {
    return redirect;
  }
  return '/dashboard';
}

export default function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTarget = useMemo(() => resolveRedirect(searchParams), [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { status, error, user, login, initialize, initialized, initializing } = useAuthStore((state) => ({
    status: state.status,
    error: state.error,
    user: state.user,
    login: state.login,
    initialize: state.initialize,
    initialized: state.initialized,
    initializing: state.initializing,
  }));

  useEffect(() => {
    if (!initialized && !initializing) {
      void initialize();
    }
  }, [initialize, initialized, initializing]);

  useEffect(() => {
    const navState = location.state as { authError?: string } | undefined;
    if (navState?.authError) {
      setFormError(navState.authError);
    }
  }, [location.state]);

  useEffect(() => {
    if (user && status === 'authenticated') {
      queryClient.setQueryData(['current-user'], user);
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, queryClient, redirectTarget, status, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      const profile = await login(email.trim(), password, totpCode.trim() || undefined);
      queryClient.setQueryData(['current-user'], profile);
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const busy = status === 'loading' || initializing;

  const inputClasses =
    'mt-1 w-full rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 px-4 py-12">
      <Card className="w-full max-w-md border border-border/60 bg-background/95 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Sign in to Squirrel API Studio</h1>
          <p className="mt-2 text-sm text-muted">Access your workspace, collaborate, and manage subscriptions.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="totp" className="block text-sm font-medium text-foreground">
              Two-factor code <span className="text-muted">(if required)</span>
            </label>
            <input
              id="totp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
          </div>
          {(formError ?? error) ? (
            <p className="text-sm text-destructive" role="alert">
              {formError ?? error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          Need an account?{' '}
          <Link to={`/signup?redirect=${encodeURIComponent(redirectTarget)}`} className="text-foreground underline">
            Create one now
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
