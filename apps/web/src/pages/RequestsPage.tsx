import { Button, Card } from '@sdl/ui';
import { NotebookPen } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalActionBar from '../components/GlobalActionBar';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';
import { useAppStore } from '../store';

export default function RequestsPage() {
  const { requestPrefill, lastRecordedResponse, clearPrefill } = useNavigationFlows();
  const { initialize, initialized, projects, history } = useAppStore((state) => ({
    initialize: state.initialize,
    initialized: state.initialized,
    projects: state.projects,
    history: state.history,
  }));
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  const requests = projects.flatMap((project) =>
    project.collections.flatMap((collection) =>
      collection.requests.map((request) => ({
        projectId: project.id as string,
        requestId: request.id as string,
        name: request.name,
        method: request.method,
        url: request.url,
      })),
    ),
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Builder</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Requests</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Inspect the generated requests, pre-fill new prompts from the AI assistant, and review response history to
            continue iterating without context loss.
          </p>
        </div>
      </header>

      <GlobalActionBar />

      {requestPrefill ? (
        <Card className="border border-indigo-500/40 bg-indigo-500/10 p-4 text-sm text-indigo-900 dark:text-indigo-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">AI pre-fill ready</p>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">{requestPrefill.plan}</p>
              <p className="mt-2 text-sm">{requestPrefill.prompt}</p>
            </div>
            <Button variant="ghost" onClick={clearPrefill}>
              Clear
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requests.map((request) => (
          <Card key={request.requestId} className="border border-border/60 bg-background/80 p-5">
            <div className="flex items-center gap-3">
              <NotebookPen className="h-5 w-5 text-accent" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-foreground">{request.name}</h2>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">{request.method}</p>
              </div>
            </div>
            <p className="mt-2 truncate font-mono text-sm text-muted">{request.url}</p>
            <Button
              className="mt-4"
              variant="primary"
              onClick={() => {
                navigate(`/project/${request.projectId}/request/${request.requestId}`);
              }}
            >
              Open details
            </Button>
          </Card>
        ))}
      </div>

      <Card className="border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold text-foreground">Recent responses</h2>
        <div className="mt-4 space-y-3 text-sm">
          {history.slice(0, 5).map((entry) => (
            <div key={entry.id as string} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">{entry.method}</span>
              <span className="truncate font-mono text-xs text-foreground">{entry.url}</span>
              <span className="text-xs text-muted">{entry.status ?? '—'} / {entry.duration ?? '—'}ms</span>
            </div>
          ))}
        </div>
        {lastRecordedResponse ? (
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted">
            Latest recorded: {lastRecordedResponse.responseId}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
