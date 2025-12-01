import { Button } from '@sdl/ui';
import type { ResponseSnapshot } from '../../types/api';

interface CookiesPanelProps {
  response?: ResponseSnapshot;
}

export default function CookiesPanel({ response }: CookiesPanelProps) {
  if (!response || response.cookies.length === 0) {
    return <p className="text-sm text-muted">No cookies received.</p>;
  }

  const copyCookieHeader = () => {
    const header = response.cookies.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ');
    navigator.clipboard.writeText(header);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{response.cookies.length} cookies</p>
        <Button size="sm" variant="ghost" onClick={copyCookieHeader}>
          Copy cookie header
        </Button>
      </div>
      <div className="space-y-3">
        {response.cookies.map((cookie) => (
          <div key={cookie.key} className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">{cookie.key}</span>
              <span className="font-mono text-sm text-foreground">{cookie.value}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted md:grid-cols-2">
              {Object.entries(cookie.attributes).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-border/40 px-3 py-2">
                  <span className="uppercase tracking-[0.3em]">{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
