import { Button } from '@sdl/ui';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FolderTree, History, Menu, RefreshCw, Zap } from 'lucide-react';
import RequestBuilder from '../components/request/RequestBuilder';
import ResponseViewer from '../components/response/ResponseViewer';
import { useAppStore } from '../store';
import { inspectVariables } from '../lib/env/resolveVars';
import WorkspaceShell from '../components/WorkspaceShell';

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
    activeEnvironmentId
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
    activeEnvironmentId: state.activeEnvironmentId
  }));

  const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId);
  const variableInspector = inspectVariables({ globals: globalVariables, environment: activeEnvironment, locals: [] });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [responseSize, setResponseSize] = useState(45);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const syncCollapse = () => setSidebarCollapsed(mq.matches);
    syncCollapse();
    mq.addEventListener('change', syncCollapse);
    return () => mq.removeEventListener('change', syncCollapse);
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth;
      setSplitOrientation(width >= 1440 ? 'vertical' : 'horizontal');
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  const clampResponseSize = (value: number) => Math.min(70, Math.max(20, value));

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (!rect.height || !rect.width) return;

      if (splitOrientation === 'horizontal') {
        const offset = rect.bottom - event.clientY;
        const percent = clampResponseSize((offset / rect.height) * 100);
        setResponseSize(percent);
      } else {
        const offset = rect.right - event.clientX;
        const percent = clampResponseSize((offset / rect.width) * 100);
        setResponseSize(percent);
      }
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    const startDragging = (event: PointerEvent) => {
      event.preventDefault();
      draggingRef.current = true;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    const handleBar = handleRef.current;
    handleBar?.addEventListener('pointerdown', startDragging);

    return () => {
      handleBar?.removeEventListener('pointerdown', startDragging);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [splitOrientation]);

  const panelVars = useMemo(
    () => ({
      '--topbar': '64px',
      '--actionbar': '92px',
      '--split-height': `${responseSize}vh`
    }) as CSSProperties,
    [responseSize]
  );

  const headerContent = (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Workspace</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="truncate text-lg font-semibold text-foreground">Squirrel API Studio</h1>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-accent shadow-sm">
            Live
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="hidden rounded-xl bg-background/80 px-3 shadow-sm md:inline-flex"
        >
          <Zap className="mr-2 h-4 w-4" aria-hidden /> Keyboard cheatsheet
        </Button>
        <Button size="sm" variant="ghost" onClick={() => projects[0] && setActiveProject(projects[0].id as string)}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Refresh
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="h-10 rounded-xl px-4"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
        >
          <Menu className="mr-2 h-4 w-4" aria-hidden />
          {sidebarCollapsed ? 'Expand' : 'Collapse'}
        </Button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col gap-6 pr-1">
      <div className="space-y-4 rounded-2xl bg-background/60 p-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.4)] ring-1 ring-border/40">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Collections</h2>
        </div>
        <div className="space-y-4 overflow-y-auto pr-1">
          {projects.map((project) => (
            <div key={project.id} className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveProject(project.id as string)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                  project.id === activeProjectId
                    ? 'bg-accent/10 text-foreground shadow-inner'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <span className="truncate">{project.name}</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted">{project.collections.length} sets</span>
              </button>
              <div className="space-y-2 pl-2">
                {project.collections.map((collection) => (
                  <div key={collection.id} className="space-y-1 rounded-xl bg-background/50 p-2 shadow-inner ring-1 ring-border/30">
                    <button
                      type="button"
                      onClick={() => setActiveCollection(collection.id as string)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                        collection.id === activeCollectionId
                          ? 'bg-white/70 text-foreground shadow-sm dark:bg-white/10'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {collection.name}
                    </button>
                    <div className="space-y-1 pl-1">
                      {collection.requests.map((request) => (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setActiveRequest(request.id as string)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] transi
tion ${
                            request.id === activeRequestId
                              ? 'bg-accent/15 text-foreground shadow-sm'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          <span className="font-semibold uppercase tracking-[0.3em]">{request.method}</span>
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
      </div>

      <div className="space-y-3 rounded-2xl bg-background/60 p-3 text-xs text-muted shadow-[0_10px_30px_-18px_rgba(0,0,0,0.4)] ring-1 ring-border/40">
        <div className="flex items-center justify-between text-foreground">
          <p className="text-[11px] uppercase tracking-[0.3em]">Resolved variables</p>
          <span className="rounded-full bg-foreground/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]">
            {variableInspector.length}
          </span>
        </div>
        <ul className="space-y-1">
          {variableInspector.map((variable) => (
            <li key={variable.key} className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 font-mono text-[11px] text-foreground">
              <span className="uppercase tracking-[0.3em] text-muted">{variable.key}</span>
              <span className="truncate pl-2">{variable.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-2xl bg-background/60 p-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.4)] ring-1 ring-border/40">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Recent history</h2>
        </div>
        <div className="space-y-2 text-xs">
          {history.slice(0, 6).map((entry) => (
            <div
              key={entry.id as string}
              className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 font-mono text-[11px] text-muted shadow-inner ring-1 ring-border/30"
            >
              <span className="font-semibold uppercase tracking-[0.3em] text-foreground">{entry.method}</span>
              <span className="truncate px-2">{entry.url}</span>
              <span>{entry.status ?? '—'} / {entry.duration ?? '—'}ms</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-muted">Requests will appear here automatically.</p>}
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceShell
      header={headerContent}
      sidebar={sidebarContent}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 lg:p-4" style={panelVars}>
        <div
          ref={splitContainerRef}
          className={`flex h-full min-h-0 overflow-hidden rounded-2xl bg-background/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)] ring-1 ring-border/40 ${
            splitOrientation === 'horizontal' ? 'flex-col' : 'flex-row'
          }`}
        >
          <div
            className="min-h-[320px] min-w-0 flex-1 overflow-hidden"
            style={
              splitOrientation === 'horizontal'
                ? { height: `${100 - responseSize}%` }
                : { width: `${100 - responseSize}%` }
            }
          >
            <RequestBuilder splitHeight={responseSize} />
          </div>

          <div
            ref={handleRef}
            className={`flex items-center justify-center bg-border/30 ${
              splitOrientation === 'horizontal'
                ? 'h-2 cursor-row-resize hover:bg-border/60'
                : 'w-2 cursor-col-resize hover:bg-border/60'
            }`}
            role="separator"
            aria-orientation={splitOrientation === 'horizontal' ? 'horizontal' : 'vertical'}
            aria-label="Resize response panel"
          >
            <span className="rounded-full bg-border/70" style={splitOrientation === 'horizontal' ? { height: 3, width: 64 } : { height: 64, width: 3 }} />
          </div>

          <div
            className="min-h-[220px] min-w-0 flex-1 overflow-hidden border-t border-border/40 bg-background/70"
            style={
              splitOrientation === 'horizontal'
                ? { height: `${responseSize}%` }
                : { width: `${responseSize}%`, borderLeft: '1px solid rgba(148, 163, 184, 0.35)' }
            }
          >
            <ResponseViewer orientation={splitOrientation} />
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

