import { Button } from '@sdl/ui';
import type { ResponseSnapshot } from '../../types/api';

interface HeadersPanelProps {
  response?: ResponseSnapshot;
}

export default function HeadersPanel({ response }: HeadersPanelProps) {
  if (!response) {
    return <p className="text-sm text-muted">No headers yet.</p>;
  }

  const entries = Object.entries(response.headers);

  const copyAll = () => {
    navigator.clipboard.writeText(entries.map(([key, value]) => `${key}: ${value}`).join('\n'));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{entries.length} headers</p>
        <Button size="sm" variant="ghost" onClick={copyAll}>
          Copy all
        </Button>
      </div>
      <div className="max-h-[360px] overflow-auto rounded-2xl border border-border/60">
        <table className="w-full text-sm">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-b border-border/40">
                <td className="px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-muted">{key}</td>
                <td className="px-4 py-2 font-mono text-xs text-foreground">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
