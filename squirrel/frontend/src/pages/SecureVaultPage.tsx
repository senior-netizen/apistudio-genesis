import { Button, Card } from '@sdl/ui';
import { Eye, EyeOff, KeyRound, RotateCw } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Secret = {
  id: number;
  name: string;
  value: string;
  rotation: string;
  revealed: boolean;
};

export function SecureVaultPage() {
  const [secrets, setSecrets] = useState<Secret[]>([
    {
      id: 1,
      name: 'PAYNOW_INTEGRATION_KEY',
      value: 'paynow_********************',
      rotation: 'Rotated 3 days ago',
      revealed: false
    },
    {
      id: 2,
      name: 'JWT_PRIVATE_KEY',
      value: '-----BEGIN PRIVATE KEY-----********',
      rotation: 'Rotated 14 days ago',
      revealed: false
    }
  ]);

  const [draft, setDraft] = useState({ name: '', value: '' });

  const addSecret = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.value.trim()) return;

    setSecrets((current) => [
      {
        id: Date.now(),
        name: draft.name.trim().toUpperCase(),
        value: draft.value.trim(),
        rotation: 'Rotated just now',
        revealed: false
      },
      ...current
    ]);

    setDraft({ name: '', value: '' });
  };

  const rotateSecret = (id: number) => {
    setSecrets((current) =>
      current.map((secret) =>
        secret.id === id
          ? {
              ...secret,
              rotation: 'Rotated just now'
            }
          : secret
      )
    );
  };

  const toggleReveal = (id: number) => {
    setSecrets((current) =>
      current.map((secret) =>
        secret.id === id
          ? {
              ...secret,
              revealed: !secret.revealed
            }
          : secret
      )
    );
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Security fabric</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">SecureVault</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Seal credentials, automate rotation, and share secrets with principle-of-least-privilege controls baked in.
          </p>
        </div>
        <Button variant="subtle">
          <KeyRound className="mr-2 h-4 w-4" aria-hidden />
          Manage access rules
        </Button>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Add secret</h2>
        <form onSubmit={addSecret} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted" htmlFor="secret-name">
              Key name
            </label>
            <input
              id="secret-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="SERVICE_TOKEN"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-muted" htmlFor="secret-value">
              Secret value
            </label>
            <textarea
              id="secret-value"
              value={draft.value}
              onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste the generated secret..."
            />
          </div>
          <Button type="submit" variant="primary">
            Store secret
          </Button>
        </form>
      </Card>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Vault inventory</h2>
        <div className="mt-4 space-y-4">
          {secrets.map((secret) => (
            <div key={secret.id} className="rounded-xl border border-border/50 bg-white/70 p-4 text-sm shadow-sm dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{secret.name}</p>
                  <p className="mt-1 text-xs text-muted">{secret.rotation}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="subtle" onClick={() => rotateSecret(secret.id)}>
                    <RotateCw className="mr-2 h-4 w-4" aria-hidden />
                    Rotate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleReveal(secret.id)}>
                    {secret.revealed ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" aria-hidden /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" aria-hidden /> Reveal
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="mt-3 font-mono text-xs text-muted">
                {secret.revealed ? secret.value : '•••••••••••••••••••••••••••'}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default SecureVaultPage;
