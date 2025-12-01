import { Button, Card } from '@sdl/ui';
import { Database, FolderTree, History, RefreshCw, Zap } from 'lucide-react';
import { useEffect } from 'react';
import RequestBuilder from '../components/request/RequestBuilder';
import ResponseViewer from '../components/response/ResponseViewer';
import { useAppStore } from '../store';
import { inspectVariables } from '../lib/env/resolveVars';
import { Tooltip } from '../components/ui/Tooltip';
import { useHealthStore } from '../state/healthStore';

export default function ApiStudioPage() {
  const {
    projects,
    activeProjectId,
    activeCollectionId,
    activeRequestId,
    setActiveProject,
    setActiveCollection,
    setActiveRequest,
    history,
    globalVariables,
    environments,
    activeEnvironmentId,
    loadRequest
  } = useAppStore((state) => ({
    projects: state.projects,
    activeProjectId: state.activeProjectId,
    activeCollectionId: state.activeCollectionId,
    activeRequestId: state.activeRequestId,
    setActiveProject: state.setActiveProject,
    setActiveCollection: state.setActiveCollection,
    setActiveRequest: state.setActiveRequest,
    history: state.history,
    globalVariables: state.globalVariables,
    environments: state.environments,
    activeEnvironmentId: state.activeEnvironmentId,
    loadRequest: state.loadRequest
  }));
  const { healthStatus, diagnostics } = useHealthStore((state) => ({
    healthStatus: state.healthStatus,
    diagnostics: state.diagnostics,
  }));

  const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId);
  const variableInspector = inspectVariables({ globals: globalVariables, environment: activeEnvironment, locals: [] });
  const statusLabel = (
    {
      live: 'LIVE',
      lagging: 'LAGGING',
      down: 'DOWN',
      rate_limited: '429',
      unauthorized: 'UNAUTHORIZED',
      checking: 'CHECKING',
    } as const
  )[healthStatus ?? 'checking'];
  const statusTone =
    healthStatus === 'live'
      ? 'text-emerald-400'
      : healthStatus === 'lagging'
        ? 'text-amber-300'
        : healthStatus === 'rate_limited'
          ? 'text-orange-300'
          : healthStatus === 'unauthorized'
            ? 'text-indigo-300'
            : 'text-red-300';
  const recommendation = diagnostics?.recommendations?.[0];

  useEffect(() => {
    if (!activeRequestId) return;
    const request = projects
      .flatMap((project) => project.collections)
      .flatMap((collection) => collection.requests)
      .find((item) => item.id === activeRequestId);
    loadRequest(request);
  }, [activeRequestId, loadRequest, projects]);

  return (
    <section className="space-y-4">
      <div className="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted">
          <Database className="h-4 w-4 text-accent" aria-hidden />
          <span>Request Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip content="Reload workspace state from storage">
            <Button
              variant="primary"
              onClick={() => projects[0] && setActiveProject(projects[0].id as string)}
              className="gap-2 rounded-[12px]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Refresh data
            </Button>
          </Tooltip>
          <Tooltip content="View every keyboard shortcut">
            <Button variant="subtle" className="gap-2 rounded-[12px]">
              <Zap className="h-4 w-4" aria-hidden /> Keyboard cheatsheet (⌘?)
            </Button>
          </Tooltip>
        </div>
      </div>

      <Card className="glass-panel border border-border/60 bg-background/80 p-4 shadow-glass">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground">
          <div className="flex flex-col gap-1">
            <span className={`font-semibold uppercase tracking-[0.3em] ${statusTone}`}>Health · {statusLabel}</span>
            <span className="text-xs text-muted">
              {diagnostics?.summary ?? 'Monitoring active environment via preflight checks and SSL validation.'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="rounded-full bg-foreground/10 px-3 py-1 text-foreground">
              {diagnostics?.statusCode ? `HTTP ${diagnostics.statusCode}` : 'Awaiting response'}
            </span>
            <span className="rounded-full bg-foreground/10 px-3 py-1 text-foreground">
              {diagnostics?.latencyMs ? `${diagnostics.latencyMs}ms latency` : 'Latency pending'}
            </span>
            {recommendation && <span className="text-orange-300">{recommendation}</span>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,380px)]">
        <Card className="glass-panel flex min-h-[400px] flex-col gap-4 border border-border/50 bg-background/80 p-6 lg:h-[calc(100vh-320px)]">
          <div className="flex items-center gap-3">
            <FolderTree className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Collections</h2>
          </div>
          <div className="space-y-6 overflow-auto pr-2">
            {projects.map((project) => (
              <div key={project.id} className="space-y-3">
                <button
                  type="button"
                  onClick={() => setActiveProject(project.id as string)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${project.id === activeProjectId
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border/60 text-muted hover:text-foreground'
                    }`}
                >
                  <span>{project.name}</span>
                  <span className="text-[11px] uppercase tracking-[0.3em]">{project.collections.length} collections</span>
                </button>
                <div className="space-y-2 pl-2">
                  {project.collections.map((collection) => (
                    <div key={collection.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setActiveCollection(collection.id as string)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${collection.id === activeCollectionId
                            ? 'bg-white/70 text-foreground shadow-sm dark:bg-white/10'
                            : 'text-muted hover:text-foreground'
                          }`}
                      >
                        {collection.name}
                      </button>
                      <div className="space-y-1 pl-3">
                        {collection.requests.map((request) => (
                          <button
                            key={request.id}
                            type="button"
                            onClick={() => setActiveRequest(request.id as string)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${request.id === activeRequestId
                                ? 'bg-accent/10 text-foreground'
                                : 'text-muted hover:text-foreground'
                              }`}
                          >
                            <span className="font-medium uppercase tracking-[0.25em]">{request.method}</span>
                            <span className="truncate font-mono">{request.url}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/75 p-4 text-xs text-muted">
            <div className="flex items-center gap-2 text-foreground">
              <Database className="h-4 w-4 text-accent" aria-hidden />
              <p className="font-semibold uppercase tracking-[0.3em]">Resolved variables</p>
            </div>
            <ul className="mt-3 space-y-2">
              {variableInspector.length ? (
                variableInspector.map((variable) => (
                  <li
                    key={variable.key}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-border/50 bg-background/85 px-3 py-2 text-[13px] text-foreground"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">{variable.key}</span>
                    <code className="rounded-[8px] bg-foreground/5 px-2 py-1 font-mono text-xs text-foreground">
                      {variable.value}
                    </code>
                  </li>
                ))
              ) : (
                <li className="rounded-[12px] border border-border/50 bg-background/70 px-3 py-2 text-xs text-muted">
                  Variables resolve automatically when environments are active.
                </li>
              )}
            </ul>
          </div>
        </Card>

        <RequestBuilder />

        <div className="flex min-h-[400px] flex-col gap-4 lg:h-[calc(100vh-320px)]">
          <ResponseViewer />

          <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent history</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {history.slice(0, 5).map((entry) => (
                <div key={entry.id as string} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">{entry.method}</span>
                  <span className="truncate font-mono text-xs text-foreground">{entry.url}</span>
                  <span className="text-xs text-muted">{entry.status ?? '—'} / {entry.duration ?? '—'}ms</span>
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-muted">Requests will appear here automatically.</p>}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
