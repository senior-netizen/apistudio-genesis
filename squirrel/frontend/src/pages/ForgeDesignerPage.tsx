import { Button, Card } from '@sdl/ui';
import { Layers, Plus, Save } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Endpoint = {
  id: number;
  method: string;
  path: string;
  description: string;
  mocked: boolean;
};

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function ForgeDesignerPage() {
  const [schemaVersion, setSchemaVersion] = useState('v1.3.0');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    {
      id: 1,
      method: 'GET',
      path: '/invoices',
      description: 'Returns paginated invoice summaries with lightweight hydration.',
      mocked: true
    },
    {
      id: 2,
      method: 'POST',
      path: '/invoices',
      description: 'Creates a new invoice and schedules reconciliation jobs.',
      mocked: false
    }
  ]);

  const [draft, setDraft] = useState({ method: 'GET', path: '', description: '', mocked: true });

  const coverage = useMemo(() => {
    if (!endpoints.length) return 0;
    const covered = endpoints.filter((endpoint) => endpoint.mocked).length;
    return Math.round((covered / endpoints.length) * 100);
  }, [endpoints]);

  const addEndpoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.path.trim()) return;

    setEndpoints((current) => [
      ...current,
      {
        id: Date.now(),
        method: draft.method,
        path: draft.path.trim(),
        description: draft.description.trim() || 'Auto-generated description pending review.',
        mocked: draft.mocked
      }
    ]);

    setDraft({ method: 'GET', path: '', description: '', mocked: true });
  };

  const toggleMock = (id: number) => {
    setEndpoints((current) =>
      current.map((endpoint) =>
        endpoint.id === id
          ? {
              ...endpoint,
              mocked: !endpoint.mocked
            }
          : endpoint
      )
    );
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Schema forge</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Forge Designer</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Model REST and GraphQL contracts, auto-provision mock servers, and keep environments synchronised with a single
            changelog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-[0.3em] text-muted" htmlFor="schema-version">
            Version
          </label>
          <input
            id="schema-version"
            value={schemaVersion}
            onChange={(event) => setSchemaVersion(event.target.value)}
            className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="primary">
            <Save className="mr-2 h-4 w-4" aria-hidden />
            Publish
          </Button>
        </div>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Endpoints</h2>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Mock coverage {coverage}%</p>
        </div>

        <div className="mt-6 space-y-4">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="rounded-xl border border-border/50 bg-white/70 p-4 text-sm shadow-sm dark:bg-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-foreground">
                  {endpoint.method}
                </span>
                <code className="font-mono text-sm text-foreground">{endpoint.path}</code>
                <Button size="sm" variant={endpoint.mocked ? 'primary' : 'subtle'} onClick={() => toggleMock(endpoint.id)}>
                  {endpoint.mocked ? 'Mock enabled' : 'Enable mock'}
                </Button>
              </div>
              <p className="mt-3 text-muted">{endpoint.description}</p>
            </div>
          ))}
        </div>

        <form onSubmit={addEndpoint} className="mt-8 space-y-4 rounded-xl border border-dashed border-border/60 p-4">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Add endpoint</h3>
          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
            <label className="text-xs uppercase tracking-[0.3em] text-muted" htmlFor="method">
              Method
            </label>
            <select
              id="method"
              value={draft.method}
              onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
              className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {methodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
            <label className="text-xs uppercase tracking-[0.3em] text-muted" htmlFor="path">
              Path
            </label>
            <input
              id="path"
              value={draft.path}
              onChange={(event) => setDraft((current) => ({ ...current, path: event.target.value }))}
              className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="/payments/:id/refund"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
            <label className="text-xs uppercase tracking-[0.3em] text-muted" htmlFor="description">
              Summary
            </label>
            <textarea
              id="description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="mocked"
              type="checkbox"
              checked={draft.mocked}
              onChange={(event) => setDraft((current) => ({ ...current, mocked: event.target.checked }))}
              className="h-4 w-4 rounded border-border/60"
            />
            <label htmlFor="mocked" className="text-xs uppercase tracking-[0.3em] text-muted">
              Auto-provision mock
            </label>
          </div>
          <Button type="submit" variant="primary">
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add endpoint
          </Button>
        </form>
      </Card>
    </section>
  );
}

export default ForgeDesignerPage;
