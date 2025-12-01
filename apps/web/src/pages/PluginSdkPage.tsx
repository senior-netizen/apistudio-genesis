import { Button, Card } from '@sdl/ui';
import { Boxes, PlugZap, Share2 } from 'lucide-react';
import { useState } from 'react';

type Plugin = {
  id: number;
  name: string;
  description: string;
  version: string;
  installed: boolean;
};

const initialPlugins: Plugin[] = [
  {
    id: 1,
    name: 'Realtime Changefeed',
    description: 'Streams contract updates from Forge into downstream caches with delta compression.',
    version: '2.1.0',
    installed: true
  },
  {
    id: 2,
    name: 'Edge A/B Orchestrator',
    description: 'Serve schema variations at the edge and aggregate Watchtower telemetry automatically.',
    version: '1.5.3',
    installed: false
  },
  {
    id: 3,
    name: 'SDK Generator',
    description: 'Emit typed SDKs for web, iOS, and server targets directly from Forge blueprints.',
    version: '3.0.1',
    installed: true
  }
];

export function PluginSdkPage() {
  const [plugins, setPlugins] = useState(initialPlugins);

  const toggleInstall = (id: number) => {
    setPlugins((current) =>
      current.map((plugin) =>
        plugin.id === id
          ? {
              ...plugin,
              installed: !plugin.installed
            }
          : plugin
      )
    );
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Extensibility</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Plugin SDK</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Extend SDL with custom behaviours and delivery rings. Plugins run in a hardened sandbox with scoped credentials and
            built-in observability.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">
            <PlugZap className="mr-2 h-4 w-4" aria-hidden />
            Create plugin
          </Button>
          <Button variant="subtle">
            <Share2 className="mr-2 h-4 w-4" aria-hidden />
            Publish to marketplace
          </Button>
        </div>
      </div>

      <Card className="glass-panel border border-border/50 bg-background/80 p-6 shadow-glass">
        <div className="flex items-center gap-3">
          <Boxes className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Installed plugins</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="rounded-xl border border-border/40 bg-white/70 p-4 text-sm shadow-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{plugin.name}</p>
                  <p className="text-xs text-muted">v{plugin.version}</p>
                </div>
                <span
                  className={
                    plugin.installed
                      ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500'
                      : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500'
                  }
                >
                  {plugin.installed ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">{plugin.description}</p>
              <Button
                className="mt-4 w-full"
                variant={plugin.installed ? 'subtle' : 'primary'}
                onClick={() => toggleInstall(plugin.id)}
              >
                {plugin.installed ? 'Disable' : 'Install'}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default PluginSdkPage;
