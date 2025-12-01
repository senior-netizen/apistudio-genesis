import type { ReactNode } from 'react';
import { FolderTree, History, PanelLeftOpen } from 'lucide-react';

interface WorkspaceShellProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function WorkspaceShell({
  header,
  sidebar,
  children,
  sidebarCollapsed = false,
  onToggleSidebar
}: WorkspaceShellProps) {
  return (
    <div className="grid h-screen grid-cols-[auto_1fr] grid-rows-[auto_1fr] overflow-hidden bg-background/70">
      <header className="sticky top-0 z-30 col-span-2 flex h-16 items-center justify-between gap-3 border-b border-border/40 bg-background/95 px-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.2)] backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted shadow-sm transition hover:text-foreground sm:flex"
            aria-label="Toggle sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
          {header}
        </div>
      </header>

      <aside
        className={`row-start-2 h-full overflow-y-auto border-r border-border/30 bg-background/80 shadow-[2px_0_16px_-10px_rgba(0,0,0,0.35)] backdrop-blur transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[64px]' : 'w-[340px]'
        }`}
        aria-label="Workspace navigation"
      >
        <div className={`h-full ${sidebarCollapsed ? 'flex flex-col items-center justify-between py-4' : 'px-4 py-4'}`}>
          {sidebarCollapsed ? (
            <div className="flex h-full flex-col items-center gap-6 text-muted">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 text-foreground shadow-sm ring-1 ring-border/50"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              </button>
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-background/70 px-2 py-3 shadow-inner ring-1 ring-border/40">
                <FolderTree className="h-4 w-4" aria-hidden />
                <History className="h-4 w-4" aria-hidden />
              </div>
            </div>
          ) : (
            sidebar
          )}
        </div>
      </aside>

      <section id="main-panel" className="row-start-2 col-start-2 flex min-w-0 flex-col overflow-hidden">
        {children}
      </section>
    </div>
  );
}

export default WorkspaceShell;
