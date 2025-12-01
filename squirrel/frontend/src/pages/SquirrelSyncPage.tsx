import { Button, Card } from '@sdl/ui';
import { Check, CloudUpload, GitCommit, Server, Timer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type StageStatus = 'pending' | 'running' | 'completed';

type Stage = {
  id: number;
  label: string;
  description: string;
  status: StageStatus;
};

type Environment = {
  id: number;
  name: string;
  version: string;
  status: 'synced' | 'drifted';
};

const initialStages: Stage[] = [
  {
    id: 1,
    label: 'Schema migration',
    description: 'Apply Forge migrations to staging clusters.',
    status: 'completed'
  },
  {
    id: 2,
    label: 'Contract verification',
    description: 'Replay Watchtower flows against the latest schema.',
    status: 'pending'
  },
  {
    id: 3,
    label: 'Release channel sync',
    description: 'Promote verified artefacts to production delivery rings.',
    status: 'pending'
  }
];

const initialEnvironments: Environment[] = [
  { id: 1, name: 'Staging', version: '2025.03.18', status: 'synced' },
  { id: 2, name: 'US Production', version: '2025.03.17', status: 'drifted' },
  { id: 3, name: 'EU Production', version: '2025.03.17', status: 'drifted' }
];

export function SquirrelSyncPage() {
  const [stages, setStages] = useState(initialStages);
  const [environments, setEnvironments] = useState(initialEnvironments);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('07:24 UTC');
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const triggerSync = () => {
    if (isSyncing) return;
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];

    setIsSyncing(true);
    setStages((current) =>
      current.map((stage, index) => ({
        ...stage,
        status: index === 0 ? 'running' : 'pending'
      }))
    );

    const stageUpdates: Array<() => void> = [
      () =>
        setStages((current) =>
          current.map((stage, index) => ({
            ...stage,
            status: index === 0 ? 'completed' : index === 1 ? 'running' : 'pending'
          }))
        ),
      () =>
        setStages((current) =>
          current.map((stage, index) => ({
            ...stage,
            status: index <= 1 ? 'completed' : 'running'
          }))
        ),
      () => {
        setStages((current) => current.map((stage) => ({ ...stage, status: 'completed' })));
        setEnvironments((current) => current.map((environment) => ({ ...environment, status: 'synced', version: '2025.03.18' })));
        setLastSync(new Date().toISOString().slice(11, 16) + ' UTC');
        setIsSyncing(false);
      }
    ];

    stageUpdates.forEach((update, index) => {
      const timer = setTimeout(update, (index + 1) * 1200);
      timers.current.push(timer);
    });
  };

  const driftedCount = useMemo(() => environments.filter((environment) => environment.status === 'drifted').length, [environments]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Deployment orchestration</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Squirrel Sync</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Promote artefacts across every surface with guaranteed parity. Sync stitches Copilot drafts, Forge schemas, and
            Watchtower gates into a deterministic pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
          <Timer className="h-4 w-4" aria-hidden /> Last sync {lastSync}
        </div>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <GitCommit className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Pipeline stages</h2>
          </div>
          <Button variant="primary" onClick={triggerSync} disabled={isSyncing}>
            <CloudUpload className="mr-2 h-4 w-4" aria-hidden />
            {isSyncing ? 'Sync in progress' : 'Sync now'}
          </Button>
        </div>

        <ol className="mt-6 space-y-4">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className="rounded-xl border border-border/50 bg-white/70 p-4 text-sm shadow-sm transition dark:bg-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">{stage.label}</p>
                  <p className="mt-1 text-xs text-muted">{stage.description}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                    stage.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : stage.status === 'running'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-border/30 text-muted'
                  }`}
                >
                  {stage.status}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Environments</h2>
          </div>
          <span className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted">
            {driftedCount ? `${driftedCount} drifted` : 'All synchronised'}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {environments.map((environment) => (
            <div key={environment.id} className="rounded-xl border border-border/40 bg-white/70 p-4 text-sm shadow-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground">{environment.name}</p>
                <span
                  className={
                    environment.status === 'synced'
                      ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500'
                      : 'rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500'
                  }
                >
                  {environment.status === 'synced' ? 'Synced' : 'Drift detected'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">Version {environment.version}</p>
              {environment.status === 'drifted' ? (
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  variant="subtle"
                  onClick={() =>
                    setEnvironments((current) =>
                      current.map((item) =>
                        item.id === environment.id ? { ...item, status: 'synced', version: '2025.03.18' } : item
                      )
                    )
                  }
                >
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                  Accept promotion
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default SquirrelSyncPage;
