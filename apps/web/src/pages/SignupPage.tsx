import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '@sdl/ui';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from '../modules/auth/AuthProvider';
import { useToast } from '../components/ui/toast';
import { sanitizeErrorMessage } from '../utils/errorSanitizer';

function validateEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

export default function SignupPage() {
  const { signup, authenticating } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; fullName?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const loading = submitting || authenticating;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (fullName.trim().length === 0) {
      nextErrors.fullName = 'Share your name so the workspace feels personal.';
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
    setSubmitting(true);
    setError(null);
    try {
      await signup({ email: email.trim().toLowerCase(), password, name: fullName.trim() });
      push({
        title: 'Account created',
        description: 'You can now sign in with your new credentials.',
        tone: 'success',
        channel: 'auth',
        actions: [
          {
            label: 'Go to login',
            icon: Sparkles,
            onClick: () => navigate('/login'),
            emphasis: 'primary',
          },
        ],
      });
      navigate('/login', { replace: true });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Unable to create your account.';
      const safeMessage = sanitizeErrorMessage(rawMessage);
      setError(safeMessage);
      push({
        title: 'Signup failed',
        description: safeMessage,
        tone: 'danger',
        channel: 'auth',
        actions: [
          {
            label: 'Check status',
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%)] px-6 py-12">
      <Card className="w-full max-w-2xl border border-border/50 bg-background/95 p-10 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-foreground">Create your Squirrel workspace</h1>
          <p className="mt-2 text-sm text-muted">
            Collaborate with your team, manage collections, and automate API quality with a refined developer experience.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2" noValidate>
          <div className="md:col-span-2 space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              className={`${inputClassName} ${fieldErrors.fullName ? 'border-destructive/70 ring-destructive/30' : ''}`}
              placeholder="Ava Chen"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
            {fieldErrors.fullName ? <p className="text-xs font-medium text-destructive">{fieldErrors.fullName}</p> : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
              Work email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              className={`${inputClassName} ${fieldErrors.email ? 'border-destructive/70 ring-destructive/30' : ''}`}
              placeholder="you@squirrellabs.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {fieldErrors.email ? <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p> : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              className={`${inputClassName} ${fieldErrors.password ? 'border-destructive/70 ring-destructive/30' : ''}`}
              placeholder="Choose a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {fieldErrors.password ? <p className="text-xs font-medium text-destructive">{fieldErrors.password}</p> : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              className={`${inputClassName} ${fieldErrors.confirmPassword ? 'border-destructive/70 ring-destructive/30' : ''}`}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-xs font-medium text-destructive">{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>
          {error ? (
            <div className="md:col-span-2 rounded-[12px] bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          ) : null}
          <div className="md:col-span-2 space-y-3">
            <Button
              type="submit"
              variant="primary"
              className="w-full rounded-[14px] py-3 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-border/70 border-t-accent" aria-hidden />
                  Creating workspace…
                </span>
              ) : (
                'Create account'
              )}
            </Button>
            <p className="text-center text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-foreground transition hover:text-accent">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
