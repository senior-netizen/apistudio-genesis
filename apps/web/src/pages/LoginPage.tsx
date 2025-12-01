import { brand } from '@sdl/language';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '@sdl/ui';
import { LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '../modules/auth/AuthProvider';
import { useToast } from '../components/ui/toast';
import { sanitizeErrorMessage } from '../utils/errorSanitizer';

function validateEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

export default function LoginPage() {
  const { login, authenticating } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const target = (location.state as { from?: string })?.from;
  const loading = submitting || authenticating;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!validateEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      push({ title: 'Welcome back', description: 'You are now signed in.', tone: 'success', channel: 'auth' });
      const destination = target && !['/login', '/signup'].includes(target) ? target : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const status = typeof (err as any)?.status === 'number' ? (err as any).status : null;
      const rawMessage = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      const safeMessage = sanitizeErrorMessage(rawMessage);
      const refinedMessage =
        safeMessage.toLowerCase().includes('csrf')
          ? 'Security token expired. Please refresh and sign in again.'
          : safeMessage.toLowerCase().includes('cookie')
            ? 'Your login cookie expired. Re-authenticate to continue.'
            : status === 401
              ? 'Credentials were rejected. Double-check your email and password.'
              : status === 403
                ? 'Access blocked by policy. Please re-login to refresh your session.'
                : safeMessage;
      setError(refinedMessage);
      push({
        title: 'Unable to sign in',
        description: refinedMessage,
        tone: 'danger',
        channel: 'auth',
        duration: 0,
        actions: [
          {
            label: 'Re-login',
            icon: LogIn,
            onClick: () => navigate('/login'),
            emphasis: 'primary',
          },
          {
            label: 'Open status',
            icon: ShieldAlert,
            onClick: () => navigate('/watchtower'),
          },
        ],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-[14px] border border-border/60 bg-background/80 px-4 py-3 text-sm text-foreground shadow-inner transition focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_55%)] px-6 py-12">
      <Card className="w-full max-w-md border border-border/50 bg-background/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Sign in to {brand.productName}</h1>
          <p className="text-sm text-muted">Craft, test, and monitor your APIs with a beautifully unified workspace.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`${inputClassName} ${fieldErrors.email ? 'border-destructive/70 ring-destructive/30' : ''}`}
              placeholder="team@squirrellabs.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {fieldErrors.email ? <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p> : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={`${inputClassName} ${fieldErrors.password ? 'border-destructive/70 ring-destructive/30' : ''}`}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {fieldErrors.password ? <p className="text-xs font-medium text-destructive">{fieldErrors.password}</p> : null}
          </div>
          {error ? <div className="rounded-[12px] bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          <Button
            type="submit"
            variant="primary"
            className="w-full rounded-[14px] py-3 text-sm font-semibold"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-border/70 border-t-accent" aria-hidden />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          New to Squirrel?{' '}
          <Link to="/signup" className="font-semibold text-foreground transition hover:text-accent">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
