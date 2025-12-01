import { useMemo, useCallback } from "react";
import { Clock, Star, StarOff, Repeat, Trash2, Download, Upload } from "lucide-react";
import { HistoryEntry, HistoryAnalyticsSnapshot } from "./types";
import { useDialog } from "./DialogProvider";

interface HistoryPanelProps {
  history: HistoryEntry[];
  analytics?: HistoryAnalyticsSnapshot;
  selectedId?: string;
  onSelect(entry: HistoryEntry): void;
  onResend(entry: HistoryEntry): void;
  onClear(): void;
  onToggleFavorite(id: string, favorite: boolean): void;
  onExport(): void;
  onImport(data: HistoryEntry[]): void;
}

const glass = "bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/10";

export function HistoryPanel({
  history,
  analytics,
  selectedId,
  onSelect,
  onResend,
  onClear,
  onToggleFavorite,
  onExport,
  onImport,
}: HistoryPanelProps) {
  const dialog = useDialog();
  const summary = useMemo(() => analytics ?? {
    total: history.length,
    successes: history.filter((entry) => entry.response && entry.response.status < 400).length,
    failures: history.filter((entry) => !entry.response || entry.response.status >= 400).length,
    favorites: history.filter((entry) => entry.favorite).length,
    averageLatency:
      history.filter((entry) => entry.response).reduce((sum, entry) => sum + (entry.response?.duration ?? 0), 0) /
      Math.max(1, history.filter((entry) => entry.response).length),
  }, [analytics, history]);

  const handleImport = useCallback(async () => {
    const text = await dialog.prompt({
      title: "Import history",
      description: "Paste the JSON export captured from Squirrel API Studio.",
      confirmLabel: "Import",
      multiline: true,
    });
    if (!text?.trim()) return;
    try {
      const parsed = JSON.parse(text) as HistoryEntry[];
      onImport(parsed);
    } catch (error) {
      await dialog.alert({
        title: "Import failed",
        description: error instanceof Error ? error.message : String(error),
        tone: "danger",
      });
    }
  }, [dialog, onImport]);

  const handleClear = useCallback(async () => {
    const confirmed = await dialog.confirm({
      title: "Clear history",
      description: "This removes the last 50 tracked requests and analytics derived from them.",
      tone: "danger",
      confirmLabel: "Clear",
    });
    if (!confirmed) return;
    onClear();
  }, [dialog, onClear]);

  return (
    <section className={`p-4 rounded-3xl space-y-4 ${glass}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <Clock size={16} />
          <span className="uppercase text-xs tracking-[0.2em]">History</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button className="px-2 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700" onClick={onExport}>
            <Download size={14} />
          </button>
          <button className="px-2 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700" onClick={handleImport}>
            <Upload size={14} />
          </button>
          <button className="px-2 py-1 rounded-full bg-rose-600/30 text-rose-100" onClick={handleClear}>
            <Trash2 size={14} />
          </button>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
        <Metric label="Requests" value={summary.total} />
        <Metric label="Favorites" value={summary.favorites} />
        <Metric label="Success %" value={summary.total ? Math.round((summary.successes / summary.total) * 100) : 0} />
        <Metric label="Avg Latency" value={`${Math.round(summary.averageLatency)} ms`} />
      </div>
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {history.map((entry) => (
          <button
            key={entry.id}
            className={`text-left rounded-2xl px-3 py-2 transition border border-transparent ${
              entry.id === selectedId ? "bg-teal-500/20 border-teal-400/40" : "hover:bg-white/10"
            }`}
            onClick={() => onSelect(entry)}
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-mono text-[11px] text-teal-200">{entry.request.method}</span>
              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="text-sm font-medium text-slate-100 truncate">{entry.request.url}</div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>
                {entry.response
                  ? `${entry.response.status} ${entry.response.statusText} (${entry.response.duration} ms)`
                  : entry.errorMessage ?? "Error"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="text-slate-400 hover:text-teal-200"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResend(entry);
                  }}
                  aria-label="Resend request"
                >
                  <Repeat size={14} />
                </button>
                <button
                  className={entry.favorite ? "text-amber-300" : "text-slate-500 hover:text-amber-200"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(entry.id, !entry.favorite);
                  }}
                  aria-label="Toggle favorite"
                >
                  {entry.favorite ? <Star size={14} /> : <StarOff size={14} />}
                </button>
              </div>
            </div>
          </button>
        ))}
        {!history.length && <p className="text-xs text-slate-500">Send a request to build your history timeline.</p>}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-900/40 border border-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
