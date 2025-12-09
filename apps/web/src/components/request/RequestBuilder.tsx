import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@sdl/ui';
import { Globe2, LayoutPanelLeft, Loader2, Send, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '../../store';
import { createEmptyRequest } from '../../store/utils';
import UrlBar from './UrlBar';
import ParamsEditor from './ParamsEditor';
import HeadersEditor from './HeadersEditor';
import BodyEditor from './BodyEditor';
import AuthEditor from './AuthEditor';
import ScriptsEditor from './ScriptsEditor';
import SendBar from './SendBar';
import type { RequestTab } from '../../store/requestSlice';
import RequestTabsBar from './RequestTabsBar';
import { Tooltip } from '../ui/Tooltip';

const tabOrder: RequestTab[] = ['params', 'headers', 'body', 'auth', 'scripts'];

export default function RequestBuilder() {
  const [splitView, setSplitView] = useState(false);
  const {
    workingRequest,
    selectedRequestTab,
    setSelectedRequestTab,
    sendRequest,
    isSending,
    unsavedChanges,
    revertWorkingRequest,
    persistWorkingRequest,
    initialize,
    initialized,
    initializing,
    initializationError,
    createBlankWorkingRequest,
    projects,
    duplicateRequest,
    activeCollectionId,
    getCollectionPermission,
    setCollectionPermission
  } = useAppStore((state) => ({
    workingRequest: state.workingRequest,
    selectedRequestTab: state.selectedRequestTab,
    setSelectedRequestTab: state.setSelectedRequestTab,
    sendRequest: state.sendRequest,
    isSending: state.isSending,
    unsavedChanges: state.unsavedChanges,
    revertWorkingRequest: state.revertWorkingRequest,
    persistWorkingRequest: state.persistWorkingRequest,
    initialize: state.initialize,
    initialized: state.initialized,
    initializing: state.initializing,
    initializationError: state.initializationError,
    createBlankWorkingRequest: state.createBlankWorkingRequest,
    projects: state.projects,
    duplicateRequest: state.duplicateRequest,
    activeCollectionId: state.activeCollectionId,
    getCollectionPermission: state.getCollectionPermission,
    setCollectionPermission: state.setCollectionPermission
  }));
  const collectionRole = activeCollectionId ? getCollectionPermission(activeCollectionId) : 'editor';
  const readOnly = collectionRole === 'viewer';

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

  useEffect(() => {
    if (initialized && !workingRequest) {
      createBlankWorkingRequest();
    }
  }, [createBlankWorkingRequest, initialized, workingRequest]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        persistWorkingRequest();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        sendRequest();
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (workingRequest?.id) {
          duplicateRequest(workingRequest.id as string);
        }
      }
      if (event.altKey) {
        const index = Number.parseInt(event.key, 10);
        if (index >= 1 && index <= tabOrder.length) {
          event.preventDefault();
          setSelectedRequestTab(tabOrder[index - 1]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duplicateRequest, persistWorkingRequest, sendRequest, setSelectedRequestTab, workingRequest?.id]);

  const currentRequest = workingRequest ?? createEmptyRequest();
  const headers = currentRequest.headers ?? [];
  const query = currentRequest.params ?? [];
  const body = currentRequest.body ?? { mode: 'none' };

  const hasWorkspaceContent = projects.some((project) =>
    project.collections.some((collection) => collection.requests.length > 0)
  );

  if (initializing || !initialized) {
    return <RequestBuilderSkeleton />;
  }

  if (initializationError) {
    return (
      <EmptyState
        title="Unable to load request"
        message={initializationError || 'Check your connection'}
        actionLabel="Retry"
        onAction={initialize}
      />
    );
  }

  if (!hasWorkspaceContent && !workingRequest) {
    return (
      <EmptyState
        title="No requests yet"
        message="Create your first API request"
        actionLabel="New Request"
        onAction={createBlankWorkingRequest}
      />
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <RequestTabsBar />

      <Card className="glass-panel overflow-hidden rounded-[16px] border border-border/60 bg-background/95 shadow-soft">
        <div className="flex items-center gap-3 border-b border-border/50 bg-background/80 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
            <Globe2 className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Request</p>
            <h2 className="text-sm font-semibold text-foreground">Destination</h2>
          </div>
        </div>
        <div className="px-4 py-4">
          <UrlBar request={{ ...currentRequest, headers, params: query, body }} />
        </div>
      </Card>

      <Card className="glass-panel overflow-hidden rounded-[16px] border border-border/60 bg-background/95 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-border/50 bg-background/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Configuration</p>
              <h2 className="text-sm font-semibold text-foreground">Params, headers &amp; body</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tabOrder.map((tab) => {
              const label =
                tab === 'params'
                  ? 'Params'
                  : tab === 'headers'
                    ? 'Headers'
                    : tab === 'body'
                      ? 'Body'
                      : tab === 'auth'
                        ? 'Auth'
                        : 'Scripts';
              const index = tabOrder.indexOf(tab) + 1;
              const active = selectedRequestTab === tab;
              return (
                <Tooltip key={tab} content={`Switch to ${label} (Alt+${index})`}>
                  <button
                    type="button"
                    onClick={() => setSelectedRequestTab(tab)}
                    className={`group flex h-11 items-center gap-2 rounded-[12px] px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? 'bg-accent/15 text-foreground shadow-inner' : 'text-muted hover:bg-white/70 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] transition ${
                        active ? 'bg-foreground/5 text-foreground' : 'bg-background/80 text-muted group-hover:text-foreground'
                      }`}
                    >
                      Alt+{index}
                    </span>
                  </button>
                </Tooltip>
              );
            })}
            {activeCollectionId ? (
              <div className="ml-auto flex items-center gap-2 rounded-[10px] border border-border/60 bg-background/70 px-3 py-2 text-xs">
                <span className="text-muted">Role</span>
                <select
                  value={collectionRole}
                  onChange={(e) => setCollectionPermission(activeCollectionId, e.target.value as any)}
                  className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                {readOnly ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-800">
                    Run-only
                  </span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSplitView((prev) => {
                  if (!prev && (selectedRequestTab === 'params' || selectedRequestTab === 'headers')) {
                    setSelectedRequestTab('body');
                  }
                  return !prev;
                });
              }}
              className={`ml-auto flex h-11 items-center gap-2 rounded-[12px] border px-3 text-sm transition ${
                splitView ? 'border-accent/60 bg-accent/10 text-foreground' : 'border-border/60 text-muted hover:text-foreground'
              }`}
            >
              <LayoutPanelLeft className="h-4 w-4" aria-hidden />
              Side-by-side
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selectedRequestTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-6"
            >
              {splitView ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <ParamsEditor request={{ ...currentRequest, params: query }} readOnly={readOnly} />
                  <HeadersEditor request={{ ...currentRequest, headers }} readOnly={readOnly} />
                </div>
              ) : (
                <>
                  {selectedRequestTab === 'params' && <ParamsEditor request={{ ...currentRequest, params: query }} readOnly={readOnly} />}
                  {selectedRequestTab === 'headers' && <HeadersEditor request={{ ...currentRequest, headers }} readOnly={readOnly} />}
                </>
              )}
              {selectedRequestTab === 'body' && <BodyEditor request={{ ...currentRequest, body, headers, params: query }} readOnly={readOnly} />}
              {selectedRequestTab === 'auth' && <AuthEditor request={currentRequest} />}
              {selectedRequestTab === 'scripts' && <ScriptsEditor request={currentRequest} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      <Card className="glass-panel overflow-hidden rounded-[16px] border border-border/60 bg-background/95 shadow-soft">
        <div className="flex items-center gap-3 border-b border-border/50 bg-background/80 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
            <Send className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Actions</p>
            <h2 className="text-sm font-semibold text-foreground">Send &amp; manage request</h2>
          </div>
        </div>
        <div className="px-4 py-4">
          <SendBar
            request={currentRequest}
            onSend={sendRequest}
            onSave={persistWorkingRequest}
            onRevert={revertWorkingRequest}
            unsavedChanges={unsavedChanges}
            isSending={isSending}
            readOnly={readOnly}
          />
          <AnimatePresence>
            {isSending ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-4 flex items-center gap-3 rounded-[12px] border border-border/50 bg-background/85 px-4 py-3 text-sm text-muted"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sending request…
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

function RequestBuilderSkeleton() {
  return (
    <div
      className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 lg:px-8"
      data-testid="request-builder-skeleton"
    >
      {[1, 2, 3].map((item) => (
        <Card
          key={item}
          className="glass-panel h-48 animate-pulse overflow-hidden rounded-[16px] border border-border/60 bg-background/60 shadow-soft"
        >
          <div className="h-full bg-gradient-to-r from-background/60 via-background/80 to-background/60" />
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  message,
  actionLabel,
  onAction
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void | Promise<void>;
}) {
  return (
    <Card
      className="glass-panel flex h-full flex-col items-center justify-center border border-dashed border-border/50 bg-background/70 p-12 text-center shadow-none"
      data-testid="request-builder-empty"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-muted">Request Builder</p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={() => void onAction()}
        className="mt-4 rounded-[12px] bg-foreground px-5 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
      >
        {actionLabel}
      </button>
    </Card>
  );
}
