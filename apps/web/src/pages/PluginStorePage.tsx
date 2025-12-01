import { useMemo } from 'react';
import { Badge, Button, Card } from '@sdl/ui';
import PluginManagerModal from '../components/PluginManagerModal';

interface PluginItem {
  id: string;
  name: string;
  author: string;
  verified: boolean;
}

export default function PluginStorePage() {
  const plugins = useMemo<PluginItem[]>(
    () => [
      { id: 'insights', name: 'Realtime Insights', author: 'Squirrel Labs', verified: true },
      { id: 'qa-bot', name: 'QA Bot', author: 'Ubuntu AI', verified: false },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 bg-background/80 p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Plugin Marketplace</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Extend Squirrel Studio with custom automation and UI widgets.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((plugin) => (
          <Card key={plugin.id} className="border border-border/50 bg-background/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{plugin.name}</h2>
                <p className="text-xs text-muted">by {plugin.author}</p>
              </div>
              {plugin.verified && <Badge variant="success" className="text-xs">Verified</Badge>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button asChild size="sm" variant="primary">
                <span>
                  <PluginManagerModal pluginId={plugin.id} />
                </span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
