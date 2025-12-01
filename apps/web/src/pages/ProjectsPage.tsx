import { Button, Card } from '@sdl/ui';
import { FolderGit2 } from 'lucide-react';
import { useEffect } from 'react';
import GlobalActionBar from '../components/GlobalActionBar';
import { useAppStore } from '../store';

export default function ProjectsPage() {
  const { projects, initialize, initialized, setActiveProject } = useAppStore((state) => ({
    projects: state.projects,
    initialize: state.initialize,
    initialized: state.initialized,
    setActiveProject: state.setActiveProject,
  }));

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Projects</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Review every collection, inspect associated requests, and jump into active workflows. Selecting a project
            updates the global builder context instantly.
          </p>
        </div>
      </header>

      <GlobalActionBar />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id as string} className="border border-border/60 bg-background/80 p-5">
            <div className="flex items-center gap-3">
              <FolderGit2 className="h-5 w-5 text-accent" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">{project.collections.length} collections</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted">
              {project.collections.map((collection) => (
                <p key={collection.id as string}>{collection.name}</p>
              ))}
            </div>
            <Button
              className="mt-4"
              variant="primary"
              onClick={() => setActiveProject(project.id as string)}
            >
              Open in builder
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
