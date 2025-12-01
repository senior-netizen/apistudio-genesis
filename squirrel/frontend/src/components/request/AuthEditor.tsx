import { ChangeEvent } from 'react';
import { Button } from '@sdl/ui';
import { LockKeyhole } from 'lucide-react';
import type { ApiRequest, RequestAuth } from '../../types/api';
import { useAppStore } from '../../store';

interface AuthEditorProps {
  request: ApiRequest;
}

const authOptions: Array<{ id: RequestAuth['type']; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'bearer', label: 'Bearer token' },
  { id: 'basic', label: 'Basic auth' },
  { id: 'apiKey', label: 'API Key' },
  { id: 'oauth2', label: 'OAuth 2.0' }
];

export default function AuthEditor({ request }: AuthEditorProps) {
  const updateWorkingRequest = useAppStore((state) => state.updateWorkingRequest);

  const setAuthType = (type: RequestAuth['type']) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      auth: { ...draft.auth, type }
    }));
  };

  const updateAuth = (changes: Partial<RequestAuth>) => {
    updateWorkingRequest((draft) => ({
      ...draft,
      auth: { ...draft.auth, ...changes }
    }));
  };

  const handleBearerChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateAuth({ bearerToken: event.target.value });
  };

  const handleBasicChange = (field: 'username' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    updateAuth({ basic: { ...(request.auth.basic ?? { username: '', password: '' }), [field]: event.target.value } });
  };

  const handleApiKeyChange = (field: 'key' | 'value' | 'in') => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...(request.auth.apiKey ?? { key: '', value: '', in: 'header' as const }) };
    next[field] = event.target.value as any;
    updateAuth({ apiKey: next });
  };

  const handleOAuthChange = (field: keyof NonNullable<RequestAuth['oauth2']>) => (event: ChangeEvent<HTMLInputElement>) => {
    updateAuth({ oauth2: { ...(request.auth.oauth2 ?? defaultOAuthConfig), [field]: event.target.value } });
  };

  const defaultOAuthConfig = {
    grantType: 'authorizationCode' as const,
    clientId: '',
    authorizationUrl: '',
    tokenUrl: '',
    scopes: []
  };

  const renderAuthDetails = () => {
    switch (request.auth.type) {
      case 'bearer':
        return (
          <input
            value={request.auth.bearerToken ?? ''}
            onChange={handleBearerChange}
            className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="{{token}}"
          />
        );
      case 'basic':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Username</label>
              <input
                value={request.auth.basic?.username ?? ''}
                onChange={handleBasicChange('username')}
                className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Password</label>
              <input
                type="password"
                value={request.auth.basic?.password ?? ''}
                onChange={handleBasicChange('password')}
                className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );
      case 'apiKey':
        return (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Key</label>
              <input
                value={request.auth.apiKey?.key ?? ''}
                onChange={handleApiKeyChange('key')}
                className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Value</label>
              <input
                value={request.auth.apiKey?.value ?? ''}
                onChange={handleApiKeyChange('value')}
                className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Location</label>
              <select
                value={request.auth.apiKey?.in ?? 'header'}
                onChange={handleApiKeyChange('in') as any}
                className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="header">Header</option>
                <option value="query">Query</option>
              </select>
            </div>
          </div>
        );
      case 'oauth2':
        return (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">Client ID</label>
                <input
                  value={request.auth.oauth2?.clientId ?? ''}
                  onChange={handleOAuthChange('clientId')}
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">Client Secret</label>
                <input
                  value={request.auth.oauth2?.clientSecret ?? ''}
                  onChange={handleOAuthChange('clientSecret')}
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">Auth URL</label>
                <input
                  value={request.auth.oauth2?.authorizationUrl ?? ''}
                  onChange={handleOAuthChange('authorizationUrl')}
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-muted">Token URL</label>
                <input
                  value={request.auth.oauth2?.tokenUrl ?? ''}
                  onChange={handleOAuthChange('tokenUrl')}
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted">Scopes (comma separated)</label>
              <input
                value={(request.auth.oauth2?.scopes ?? []).join(', ')}
                onChange={(event) =>
                  updateAuth({
                    oauth2: {
                      ...(request.auth.oauth2 ?? defaultOAuthConfig),
                      scopes: event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                    }
                  })
                }
                className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );
      default:
        return <p className="text-sm text-muted">Authentication disabled for this request.</p>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {authOptions.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={request.auth.type === option.id ? 'primary' : 'ghost'}
            onClick={() => setAuthType(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/70 p-6">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <LockKeyhole className="h-4 w-4" aria-hidden />
          Authentication settings
        </div>
        <div className="mt-4 space-y-3">{renderAuthDetails()}</div>
      </div>
    </div>
  );
}
