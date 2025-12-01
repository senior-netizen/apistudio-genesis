import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

function validateEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

export default function SignupPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = useMemo(() => resolveRedirect(searchParams), [searchParams]);

  const { status, error, user, register, initialize, initialized, initializing } = useAuthStore((state) => ({
    status: state.status,
    error: state.error,
    user: state.user,
    register: state.register,
    initialize: state.initialize,
    initialized: state.initialized,
    initializing: state.initializing,
  }));

  const [displayName, setDisplayName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialized && !initializing) {
      void initialize();
    }
  }, [initialize, initialized, initializing]);

  useEffect(() => {
    if (user && status === 'authenticated') {
      queryClient.setQueryData(['current-user'], user);
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, queryClient, redirectTarget, status, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (!displayName.trim()) {
      nextErrors.displayName = 'Tell us your name so teammates can recognise you.';
    }
    if (!workspaceName.trim()) {
      nextErrors.workspaceName = 'Choose a workspace name to personalise your space.';
    }
    if (!validateEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords must match.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const profile = await register({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
        workspaceName: workspaceName.trim(),
      });
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
      <Card className="w-full max-w-3xl border border-border/60 bg-background/95 p-10 shadow-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold text-foreground">Create your Squirrel workspace</h1>
          <p className="mt-2 text-sm text-muted">
            Collaborate with your team, manage API collections, and automate quality checks with Squirrel API Studio.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
              Your name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
            {fieldErrors.displayName ? (
              <p className="text-xs font-medium text-destructive">{fieldErrors.displayName}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="workspaceName" className="block text-sm font-medium text-foreground">
              Workspace name
            </label>
            <input
              id="workspaceName"
              type="text"
              autoComplete="organization"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
            {fieldErrors.workspaceName ? (
              <p className="text-xs font-medium text-destructive">{fieldErrors.workspaceName}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
            {fieldErrors.email ? <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
            {fieldErrors.password ? <p className="text-xs font-medium text-destructive">{fieldErrors.password}</p> : null}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={busy}
              className={inputClasses}
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-xs font-medium text-destructive">{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>
          {(formError ?? error) ? (
            <p className="md:col-span-2 text-sm text-destructive" role="alert">
              {formError ?? error}
            </p>
          ) : null}
          <div className="md:col-span-2 space-y-3">
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? 'Creating workspace…' : 'Create account'}
            </Button>
            <p className="text-center text-xs text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-foreground underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
