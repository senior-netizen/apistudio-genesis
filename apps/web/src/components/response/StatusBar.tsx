import { Badge } from '@sdl/ui';
import { Copy, Download, Timer } from 'lucide-react';
import type { ResponseSnapshot } from '../../types/api';

interface StatusBarProps {
  response?: ResponseSnapshot;
  onCopyCurl: () => void;
  onDownload: () => void;
  progress?: { receivedBytes: number; totalBytes?: number };
}

export default function StatusBar({ response, onCopyCurl, onDownload, progress }: StatusBarProps) {
  if (!response) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-muted">
        <span>Awaiting response…</span>
        {progress && (
          <span className="text-xs">{formatProgress(progress.receivedBytes, progress.totalBytes)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/80 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={response.status < 400 ? 'success' : 'destructive'}>{response.status}</Badge>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">{response.method}</span>
        <code className="font-mono text-sm text-foreground">{response.url}</code>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" aria-hidden /> {response.duration}ms
        </span>
        <span>{formatBytes(response.size)}</span>
        <button type="button" onClick={onCopyCurl} className="flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 hover:text-foreground">
          <Copy className="h-3.5 w-3.5" aria-hidden /> Copy cURL
        </button>
        <button type="button" onClick={onDownload} className="flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 hover:text-foreground">
          <Download className="h-3.5 w-3.5" aria-hidden /> Download body
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatProgress(received: number, total?: number) {
  if (!total || total === 0) {
    return `${formatBytes(received)} received`;
  }
  const percent = ((received / total) * 100).toFixed(0);
  return `${formatBytes(received)} / ${formatBytes(total)} (${percent}%)`;
}
