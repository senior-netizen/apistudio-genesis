import { useMemo, useState, type DragEvent, type KeyboardEvent } from 'react';
import { Copy, Pencil, X, Waves } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../ui/toast';

const methodColors: Record<string, string> = {
  GET: 'text-emerald-500',
  POST: 'text-blue-500',
  PUT: 'text-amber-500',
  PATCH: 'text-purple-500',
  DELETE: 'text-red-500',
  HEAD: 'text-sky-500',
  OPTIONS: 'text-cyan-500'
};

export function RequestTabsBar() {
  const {
    openRequestTabs,
    activeRequestTabId,
    activateRequestTab,
    closeRequestTab,
    renameRequestTab,
    duplicateRequestTab,
    moveRequestTab,
    projects
  } = useAppStore((state) => ({
    openRequestTabs: state.openRequestTabs,
    activeRequestTabId: state.activeRequestTabId,
    activateRequestTab: state.activateRequestTab,
    closeRequestTab: state.closeRequestTab,
    renameRequestTab: state.renameRequestTab,
    duplicateRequestTab: state.duplicateRequestTab,
    moveRequestTab: state.moveRequestTab,
    projects: state.projects
  }));
  const { push } = useToast();

  const requestLookup = useMemo(() => {
    const map = new Map<string, { method: string; name: string }>();
    projects
      .flatMap((project) => project.collections)
      .flatMap((collection) => collection.requests)
      .forEach((request) => {
        map.set(String(request.id), { method: request.method, name: request.name });
      });
    return map;
  }, [projects]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const beginEditing = (requestId: string, currentTitle: string) => {
    setEditingId(requestId);
    setDraftTitle(currentTitle);
  };

  const submitRename = (requestId: string) => {
    if (!draftTitle.trim()) {
      setEditingId(null);
      return;
    }
    renameRequestTab(requestId, draftTitle.trim());
    setEditingId(null);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, requestId: string) => {
    event.dataTransfer.setData('text/plain', requestId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;
    const targetIndex = openRequestTabs.findIndex((tab) => tab.requestId === targetId);
    if (targetIndex >= 0) {
      moveRequestTab(draggedId, targetIndex);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/80 px-3 py-2 shadow-glass">
      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        {openRequestTabs.map((tab, _index) => {
          const request = requestLookup.get(tab.requestId);
          const isActive = activeRequestTabId === tab.requestId;
          const title = tab.title || request?.name || 'Untitled request';
          const methodClass = methodColors[(request?.method ?? '').toUpperCase()] ?? 'text-muted';
          return (
            <div
              key={tab.requestId}
              role="button"
              tabIndex={0}
              className={`group relative flex min-w-[180px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? 'border-accent bg-accent/10 text-foreground shadow-inner'
                  : 'border-border/40 bg-background/60 text-muted hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10'
              }`}
              draggable
              onDragStart={(event) => handleDragStart(event, tab.requestId)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, tab.requestId)}
              onClick={() => activateRequestTab(tab.requestId)}
              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activateRequestTab(tab.requestId);
                }
              }}
            >
              <span className={`text-xs font-semibold uppercase tracking-[0.3em] ${methodClass}`}>
                {request?.method ?? 'REQ'}
              </span>
              {editingId === tab.requestId ? (
                <input
                  value={draftTitle}
                  autoFocus
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={() => submitRename(tab.requestId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      submitRename(tab.requestId);
                    }
                    if (event.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  className="flex-1 rounded bg-transparent text-sm font-medium text-foreground outline-none"
                />
              ) : (
                <span className={`flex-1 truncate text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted'}`}>
                  {title}
                </span>
              )}

              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-md p-1 text-muted hover:text-foreground"
                  aria-label="Rename tab"
                  onClick={(event) => {
                    event.stopPropagation();
                    beginEditing(tab.requestId, title);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted hover:text-foreground"
                  aria-label="Duplicate tab"
                  onClick={(event) => {
                    event.stopPropagation();
                    duplicateRequestTab(tab.requestId);
                    push({
                      title: 'Duplicated request tab',
                      description: `${title} opened as a working copy.`,
                      tone: 'info',
                      channel: 'request',
                      actions: [
                        {
                          label: 'Open logs',
                          icon: Waves,
                          onClick: () => window.dispatchEvent(new CustomEvent('squirrel-open-logs')),
                        },
                      ],
                    });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted hover:text-destructive"
                  aria-label="Close tab"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeRequestTab(tab.requestId);
                  }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent opacity-0 transition group-hover:opacity-100" />
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />}
            </div>
          );
        })}
        {openRequestTabs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/50 px-4 py-2 text-sm text-muted">
            No open requests. Select a request to begin.
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestTabsBar;
