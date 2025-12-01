import { useEffect, useMemo, type CSSProperties } from 'react';
import { Card } from '@sdl/ui';
import { Globe2, Loader2, Send, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '../../store';
import UrlBar from './UrlBar';
import ParamsEditor from './ParamsEditor';
import HeadersEditor from './HeadersEditor';
import BodyEditor from './BodyEditor';
import AuthEditor from './AuthEditor';
import ScriptsEditor from './ScriptsEditor';
import SendBar from './SendBar';
import type { RequestTab } from '../../store/requestSlice';
import RequestTabsBar from './RequestTabsBar';
import { CollaboratorAvatars } from '../../modules/collab/CollaboratorAvatars';

const tabOrder: RequestTab[] = ['params', 'headers', 'body', 'auth', 'scripts'];

interface RequestBuilderProps {
  splitHeight?: number;
}

export default function RequestBuilder({ splitHeight = 45 }: RequestBuilderProps) {
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
    initialized
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
    initialized: state.initialized
  }));

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

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
  }, [persistWorkingRequest, sendRequest, setSelectedRequestTab]);

  const surfaceVars = useMemo(
    () => ({
      '--topbar': '64px',
      '--actionbar': '92px',
      '--split-height': `${splitHeight}vh`
    }) as CSSProperties,
    [splitHeight]
  );

  if (!workingRequest) {
    return (
      <Card className="glass-panel flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/70 p-10 text-center shadow-none">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">No request selected</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Create your first request</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Start by selecting a request from the collections sidebar or generate a new one with the seed examples. Your progress is saved locally.
        </p>
      </Card>
    );
  }

  const tabLabel = (tab: RequestTab) =>
    tab === 'params' ? 'Params' : tab === 'headers' ? 'Headers' : tab === 'body' ? 'Body' : tab === 'auth' ? 'Auth' : 'Scripts';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" style={surfaceVars}>
      <RequestTabsBar />

      <Card className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-background/90 p-4 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.65)] ring-1 ring-border/40">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Globe2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Request</p>
              <h2 className="text-sm font-semibold text-foreground">Destination</h2>
            </div>
          </div>
          <CollaboratorAvatars />
        </div>
        <UrlBar request={workingRequest} />
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-background/90 shadow-[0_16px_48px_-34px_rgba(0,0,0,0.6)] ring-1 ring-border/40">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/30 bg-background/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
            </span>
            Micro-panels
          </div>
          <div className="flex flex-1 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
            {tabOrder.map((tab) => {
              const active = selectedRequestTab === tab;
              const label = tabLabel(tab);
              const index = tabOrder.indexOf(tab) + 1;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedRequestTab(tab)}
                  className={`group flex min-w-[96px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    active ? 'bg-accent/15 text-foreground shadow-inner ring-1 ring-accent/40' : 'text-muted hover:bg-background'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${active ? 'bg-foreground/10 text-foreground' : 'bg-background/80 text-muted group-hover:text-foreground'}`}>
                    Alt+{index}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative flex-1 min-h-0 px-4 pb-4">
          <div
            className="h-full overflow-y-auto rounded-xl bg-background/70 p-4 shadow-inner"
            style={{ maxHeight: 'calc(100vh - var(--topbar) - var(--actionbar) - var(--split-height))' }}
          >
            <div key={selectedRequestTab} className="space-y-4 text-sm">
              {selectedRequestTab === 'params' && <ParamsEditor request={workingRequest} />}
              {selectedRequestTab === 'headers' && <HeadersEditor request={workingRequest} />}
              {selectedRequestTab === 'body' && <BodyEditor request={workingRequest} />}
              {selectedRequestTab === 'auth' && <AuthEditor request={workingRequest} />}
              {selectedRequestTab === 'scripts' && <ScriptsEditor request={workingRequest} />}
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 rounded-2xl bg-background/90 p-4 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.6)] ring-1 ring-border/40">
        <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Send className="h-4 w-4" aria-hidden />
          </span>
          Send &amp; manage
        </div>
        <SendBar
          request={workingRequest}
          onSend={sendRequest}
          onSave={persistWorkingRequest}
          onRevert={revertWorkingRequest}
          unsavedChanges={unsavedChanges}
          isSending={isSending}
        />
        {isSending && (
          <div className="flex items-center gap-3 rounded-xl bg-background/80 px-3 py-2 text-sm text-muted ring-1 ring-border/40">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Sending request…
          </div>
        )}
      </Card>
    </div>
  );
}
