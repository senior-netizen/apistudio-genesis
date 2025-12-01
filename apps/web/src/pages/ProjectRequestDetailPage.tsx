import { Card } from '@sdl/ui';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store';

export default function ProjectRequestDetailPage() {
  const params = useParams<{ projectId: string; requestId: string }>();
  const { initialize, initialized, projects } = useAppStore((state) => ({
    initialize: state.initialize,
    initialized: state.initialized,
    projects: state.projects,
  }));

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  const request = useMemo(() => {
    return projects
      .find((project) => (project.id as string) === params.projectId)
      ?.collections.flatMap((collection) => collection.requests)
      .find((item) => (item.id as string) === params.requestId);
  }, [projects, params.projectId, params.requestId]);

  if (!request) {
    return (
      <Card className="border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-900 dark:text-red-200">
        Request not found. Ensure the project and request identifiers are valid.
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Request details</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{request.name}</h1>
        <p className="mt-2 font-mono text-sm text-muted">{request.method} · {request.url}</p>
      </header>

      <Card className="border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold text-foreground">Headers</h2>
        <div className="mt-3 space-y-2 text-sm">
          {request.headers?.length
            ? request.headers.map((header) => (
                <div key={header.id as string} className="flex justify-between gap-4">
                  <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">{header.key}</span>
                  <span className="font-mono text-xs text-foreground">{header.value}</span>
                </div>
              ))
            : 'No headers'}
        </div>
      </Card>

      <Card className="border border-border/60 bg-background/80 p-5">
        <h2 className="text-lg font-semibold text-foreground">Body</h2>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/80 p-4 text-xs text-white">
{request.body?.mode === 'json' ? request.body.json : 'No body provided.'}
        </pre>
      </Card>
    </section>
  );
}
