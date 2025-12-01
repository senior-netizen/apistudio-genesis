import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CommandPalette, useCommandPalette, type Command } from '@sdl/ui/command-palette';
import { useSyncClient, useSyncStatus } from '@sdl/sync-client/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Database, Gauge, Sparkles, Users, X } from 'lucide-react';

import { useAppStore } from '../../store';
import type { CollaborationMember } from '../../types/collaboration';
import type { BetaFlagsState } from '../beta/useBetaFlags';
import { loadWorkspace } from '../../lib/storage/indexedDb';
import { createInitialCollaborationState } from '../../store/collaborationSlice';

interface DevToolsManagerProps {
  role?: string;
  profileName?: string;
  betaGroup?: BetaFlagsState['group'];
  children: ReactNode;
  onNavigate: (path: string) => void;
}

interface CacheMetrics {
  requestHistoryBytes: number;
  tabCount: number;
}

interface WorkspaceStats {
  projectCount: number;
  collectionCount: number;
  requestCount: number;
  environmentCount: number;
  historyCount: number;
  mocksCount: number;
  activeRequestName: string | null;
  peers: CollaborationMember[];
}

interface DevConsoleLogEntry {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, unknown> | null;
}

type IdleCallbackHandle = number;

function scheduleIdleWork(callback: () => void, timeout = 200): IdleCallbackHandle {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as Window & {
      requestIdleCallback(callback: () => void, options?: { timeout?: number }): number;
    }).requestIdleCallback(() => callback(), { timeout });
  }
  return setTimeout(callback, timeout) as unknown as IdleCallbackHandle;
}

function cancelIdleWork(handle: IdleCallbackHandle) {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as Window & { cancelIdleCallback(handle: number): void }).cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle);
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value > 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatRelative(timestamp: string | undefined): string {
  if (!timestamp) return 'unknown';
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 48) return `${diffHours} hours ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} days ago`;
}

function computePresencePosition(seed: string) {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  }
  const top = 8 + (hash % 84);
  const left = 6 + ((hash / 97) % 88);
  return { top: `${top}%`, left: `${left}%` };
}

function DevConsoleOverlay({
  open,
  onClose,
  stats,
  profile,
  syncStatus,
  deviceId,
  cacheMetrics,
  logEntries,
}: {
  open: boolean;
  onClose: () => void;
  stats: WorkspaceStats;
  profile: { role?: string; betaGroup?: string | null; name?: string };
  syncStatus: string;
  deviceId: string | null;
  cacheMetrics: CacheMetrics;
  logEntries: DevConsoleLogEntry[];
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const now = useMemo(() => new Date().toLocaleTimeString(), [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed bottom-6 left-1/2 z-[110] w-[min(960px,95vw)] -translate-x-1/2 rounded-3xl border border-white/10 bg-slate-950/95 text-white shadow-[0_40px_120px_-25px_rgba(8,15,35,0.7)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-400">Hidden Squirrel Dev Console</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                Workspace Diagnostics · {now}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Close dev console"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="grid gap-6 px-6 py-5 md:grid-cols-3">
            <section className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-emerald-300" aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200/70">Workspace</h3>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Projects</dt>
                  <dd className="mt-1 text-lg font-semibold">{stats.projectCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Collections</dt>
                  <dd className="mt-1 text-lg font-semibold">{stats.collectionCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Requests</dt>
                  <dd className="mt-1 text-lg font-semibold">{stats.requestCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Environments</dt>
                  <dd className="mt-1 text-lg font-semibold">{stats.environmentCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">History entries</dt>
                  <dd className="mt-1 text-lg font-semibold">{stats.historyCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Mocks</dt>
                  <dd className="mt-1 text-lg font-semibold">{stats.mocksCount}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-black/30 px-3 py-2 text-xs text-zinc-300">
                Active request · {stats.activeRequestName ?? 'none selected'}
              </p>
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-sky-300" aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200/70">Runtime</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Sync status</dt>
                  <dd className="rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-sky-200">
                    {syncStatus}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Sync client</dt>
                  <dd className="text-sm text-zinc-200">{deviceId ?? 'handshake pending'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Peers online</dt>
                  <dd className="text-sm text-zinc-200">
                    {stats.peers.filter((peer) => peer.presence !== 'offline').length} / {stats.peers.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Role</dt>
                  <dd className="text-sm text-zinc-200">{profile.role ?? 'unknown'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Beta cohort</dt>
                  <dd className="text-sm text-zinc-200">{profile.betaGroup ?? 'none'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Operator</dt>
                  <dd className="text-sm text-zinc-200">{profile.name ?? 'Anonymous squirrel'}</dd>
                </div>
              </dl>
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-3">
                <Gauge className="h-4 w-4 text-amber-300" aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200/70">Local caches</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Request history</dt>
                  <dd className="text-sm text-zinc-200">{formatBytes(cacheMetrics.requestHistoryBytes)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs uppercase tracking-[0.28em] text-zinc-400">Open tabs cached</dt>
                  <dd className="text-sm text-zinc-200">{cacheMetrics.tabCount}</dd>
                </div>
                <div className="rounded-xl bg-black/30 px-3 py-2 text-xs text-zinc-300">
                  Cached request timeline keeps recent responses available offline. Use the palette to flush.
                </div>
              </dl>
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <Sparkles className="h-3 w-3" aria-hidden />
                Shortcuts: Ctrl/Cmd + ` to toggle · Ctrl/Cmd + Shift + P for command palette
              </p>
            </section>
          </div>
          <div className="border-t border-white/10 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-200/70">Structured diagnostics</h3>
              <span className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Idle formatted</span>
            </div>
            <DiagnosticsInspector
              payload={{ stats, profile, syncStatus, deviceId, cacheMetrics }}
            />
          </div>
          <div className="border-t border-white/10 px-6 pb-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-200/70">Recent console activity</h3>
            <DevConsoleLogList entries={logEntries} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DiagnosticsInspector({ payload }: { payload: Record<string, unknown> }) {
  const [pretty, setPretty] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const handle = scheduleIdleWork(() => {
      if (cancelled) {
        return;
      }
      try {
        setPretty(JSON.stringify(payload, null, 2));
      } catch (error) {
        setPretty('// Unable to format diagnostics payload');
      }
    });
    return () => {
      cancelled = true;
      cancelIdleWork(handle);
    };
  }, [payload]);

  const handleCopy = useCallback(() => {
    if (!pretty) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(pretty).catch((error) => {
        console.warn('[devtools] Failed to copy diagnostics', error);
      });
    }
  }, [pretty]);

  return (
    <div className="relative mt-4">
      <pre className="max-h-[220px] overflow-auto rounded-2xl border border-white/12 bg-black/40 p-4 font-mono text-[14px] leading-6 text-zinc-200 shadow-inner">
        {pretty || 'Preparing diagnostics…'}
      </pre>
      <button
        type="button"
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={handleCopy}
        aria-label="Copy diagnostics JSON"
        disabled={!pretty}
      >
        Copy JSON
      </button>
    </div>
  );
}

function DevConsoleLogList({ entries }: { entries: DevConsoleLogEntry[] }) {
  const handleCopy = useCallback((entry: DevConsoleLogEntry) => {
    const content = entry.context
      ? `${entry.message}\n${JSON.stringify(entry.context, null, 2)}`
      : entry.message;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(content).catch((error) => {
        console.warn('[devtools] Failed to copy log entry', error);
      });
    }
  }, []);

  if (entries.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-400">
        Console interactions will appear here as you run commands or maintenance tasks.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {entries
        .slice()
        .reverse()
        .map((entry) => {
          const date = new Date(entry.timestamp);
          const time = Number.isNaN(date.getTime()) ? entry.timestamp : date.toLocaleTimeString();
          const badgeColor =
            entry.level === 'error'
              ? 'bg-red-500/20 text-red-200 border-red-400/30'
              : entry.level === 'warning'
              ? 'bg-amber-500/20 text-amber-100 border-amber-400/30'
              : 'bg-emerald-500/15 text-emerald-100 border-emerald-400/30';
          return (
            <li
              key={entry.id}
              className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/90 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.8)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.32em] text-zinc-400">{time}</span>
                <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${badgeColor}`}>
                  {entry.level}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(entry)}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-label="Copy log entry"
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 text-sm text-white/90">{entry.message}</p>
              {entry.context ? (
                <pre className="mt-2 overflow-x-auto rounded-xl bg-black/40 p-3 font-mono text-[12px] leading-5 text-zinc-300">
                  {JSON.stringify(entry.context, null, 2)}
                </pre>
              ) : null}
            </li>
          );
        })}
    </ul>
  );
}

function PresenceDebugOverlay({ visible, peers }: { visible: boolean; peers: CollaborationMember[] }) {
  if (!visible) return null;
  const onlinePeers = peers.filter((peer) => peer.presence !== 'offline');
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] text-white">
      <div className="absolute right-6 top-6 rounded-2xl border border-white/20 bg-slate-950/80 px-4 py-3 text-xs tracking-[0.28em] text-white/70 shadow-lg backdrop-blur-xl">
        Presence debug · peers {onlinePeers.length}/{peers.length}
      </div>
      {peers.map((peer) => {
        const position = computePresencePosition(peer.id);
        return (
          <div
            key={peer.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-slate-900/80 px-3 py-2 text-xs shadow-lg backdrop-blur"
            style={{ left: position.left, top: position.top }}
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/60">
              <Users className="h-3 w-3 text-emerald-300" aria-hidden />
              {peer.name}
            </div>
            <div className="mt-1 text-[11px] text-zinc-300">Cursor synced · {peer.presence}</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Last ping {formatRelative(peer.lastActiveAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FpsOverlay({ visible }: { visible: boolean }) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let last = performance.now();
    let raf: number;
    const loop = (timestamp: number) => {
      frame += 1;
      if (timestamp - last >= 1000) {
        setFps(Math.round((frame * 1000) / (timestamp - last)));
        frame = 0;
        last = timestamp;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed left-6 top-6 z-[100] rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.28em] text-emerald-100 shadow-lg backdrop-blur">
      FPS {fps}
    </div>
  );
}

function SquirrelTrail({ enabled }: { enabled: boolean }) {
  const [points, setPoints] = useState<Array<{ x: number; y: number; ts: number }>>([]);
  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      return;
    }
    let animationFrame: number;
    const latest = { x: 0, y: 0, dirty: false };
    const handlePointer = (event: PointerEvent) => {
      latest.x = event.clientX;
      latest.y = event.clientY;
      latest.dirty = true;
    };
    const step = () => {
      animationFrame = requestAnimationFrame(step);
      if (!latest.dirty) {
        setPoints((current) => current.filter((point) => performance.now() - point.ts < 360));
        return;
      }
      latest.dirty = false;
      const now = performance.now();
      setPoints((current) => {
        const next = [...current, { x: latest.x, y: latest.y, ts: now }];
        return next.filter((point) => now - point.ts < 360).slice(-18);
      });
    };
    window.addEventListener('pointermove', handlePointer);
    animationFrame = requestAnimationFrame(step);
    return () => {
      window.removeEventListener('pointermove', handlePointer);
      cancelAnimationFrame(animationFrame);
      setPoints([]);
    };
  }, [enabled]);

  if (!enabled || points.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[140] overflow-hidden">
      {points.map((point, index) => {
        const opacity = (index + 1) / points.length;
        const size = 18 + index * 1.2;
        return (
          <span
            key={`${point.ts}-${index}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/30 blur-lg"
            style={{ left: point.x, top: point.y, width: size, height: size, opacity }}
          />
        );
      })}
    </div>
  );
}

export function DevToolsManager({ role, profileName, betaGroup, children, onNavigate }: DevToolsManagerProps) {
  const isAuthorized = role === 'owner' || role === 'admin';
  const syncStatus = useSyncStatus();
  const syncClient = useSyncClient();
  const stats = useAppStore(
    useCallback(
      (state) => {
        const projectCount = state.projects.length;
        const collectionCount = state.projects.reduce((total, project) => total + project.collections.length, 0);
        const requestCount = state.projects
          .flatMap((project) => project.collections)
          .reduce((total, collection) => total + collection.requests.length, 0);
        const activeRequest = state.projects
          .flatMap((project) => project.collections)
          .flatMap((collection) => collection.requests)
          .find((request) => request.id === state.activeRequestId);
        return {
          projectCount,
          collectionCount,
          requestCount,
          environmentCount: state.environments.length,
          historyCount: state.history.length,
          mocksCount: state.mocks.length,
          activeRequestName: activeRequest?.name ?? null,
          peers: state.collaboration.members,
        } satisfies WorkspaceStats;
      },
      [],
    ),
  );

  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const [presenceVisible, setPresenceVisible] = useState(false);
  const [fpsVisible, setFpsVisible] = useState(false);
  const [trailEnabled, setTrailEnabled] = useState(false);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>({ requestHistoryBytes: 0, tabCount: 0 });
  const [logEntries, setLogEntries] = useState<DevConsoleLogEntry[]>([]);

  const appendLog = useCallback(
    (level: DevConsoleLogEntry['level'], message: string, context?: Record<string, unknown>) => {
      const entry: DevConsoleLogEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        level,
        message,
        timestamp: new Date().toISOString(),
        context: context ?? null,
      };
      setLogEntries((current) => [...current.slice(-39), entry]);
    },
    [],
  );

  const updateCacheMetrics = useCallback(() => {
    if (typeof window === 'undefined') {
      setCacheMetrics({ requestHistoryBytes: 0, tabCount: 0 });
      return;
    }
    const historyRaw = window.localStorage.getItem('sdl.request-runner.history');
    const tabsRaw = window.localStorage.getItem('sdl.request-tabs');
    let tabCount = 0;
    if (tabsRaw) {
      try {
        const parsed = JSON.parse(tabsRaw);
        if (Array.isArray(parsed)) {
          tabCount = parsed.length;
        }
      } catch (error) {
        tabCount = 0;
      }
    }
    setCacheMetrics({ requestHistoryBytes: historyRaw ? historyRaw.length : 0, tabCount });
  }, []);

  useEffect(() => {
    if (devConsoleOpen) {
      updateCacheMetrics();
    }
  }, [devConsoleOpen, updateCacheMetrics]);

  useEffect(() => {
    if (!isAuthorized) {
      setDevConsoleOpen(false);
      setPresenceVisible(false);
      setFpsVisible(false);
      setTrailEnabled(false);
    }
  }, [isAuthorized]);

  const openDevConsole = useCallback(() => setDevConsoleOpen(true), []);
  const closeDevConsole = useCallback(() => setDevConsoleOpen(false), []);
  const toggleDevConsole = useCallback(() => setDevConsoleOpen((value) => !value), []);

  const showPresenceLayer = useCallback(() => setPresenceVisible(true), []);
  const hidePresenceLayer = useCallback(() => setPresenceVisible(false), []);

  const showFpsLayer = useCallback(() => setFpsVisible(true), []);
  const hideFpsLayer = useCallback(() => setFpsVisible(false), []);

  const flushLocalRequestCache = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('sdl.request-runner.history');
        window.localStorage.removeItem('sdl.request-tabs');
      }
      updateCacheMetrics();
      console.info('[devtools] Flushed local request cache.');
      appendLog('info', 'Local request cache flushed');
    } catch (error) {
      console.error('[devtools] Failed to flush cache', error);
      appendLog('error', 'Failed to flush local request cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [appendLog, updateCacheMetrics]);

  const refreshEnvironmentVariables = useCallback(async () => {
    try {
      const bundle = await loadWorkspace();
      if (!bundle) return;
      useAppStore.setState((state) => {
        state.environments = bundle.environments;
        state.activeEnvironmentId =
          bundle.environments.find((env) => env.isDefault)?.id ?? bundle.environments[0]?.id ?? null;
      });
      console.info('[devtools] Environment variables refreshed.');
      appendLog('info', 'Environment variables reloaded from storage');
    } catch (error) {
      console.error('[devtools] Failed to refresh environments', error);
      appendLog('error', 'Failed to refresh environment variables', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [appendLog]);

  const resyncWorkspaceState = useCallback(async () => {
    try {
      const bundle = await loadWorkspace();
      if (!bundle) return;
      useAppStore.setState((state) => {
        state.projects = bundle.projects;
        state.environments = bundle.environments;
        state.history = bundle.history;
        state.mocks = bundle.mocks;
        state.collaboration = bundle.collaboration ?? state.collaboration ?? createInitialCollaborationState();
        state.activeProjectId = bundle.projects[0]?.id ?? null;
        state.activeCollectionId = bundle.projects[0]?.collections[0]?.id ?? null;
        state.activeRequestId = bundle.projects[0]?.collections[0]?.requests[0]?.id ?? null;
        state.activeEnvironmentId =
          bundle.environments.find((env) => env.isDefault)?.id ?? bundle.environments[0]?.id ?? null;
      });
      const state = useAppStore.getState();
      state.restoreRequestTabs();
      const activeRequest = state.projects
        .flatMap((project) => project.collections)
        .flatMap((collection) => collection.requests)
        .find((request) => request.id === state.activeRequestId);
      state.loadRequest(activeRequest);
      console.info('[devtools] Workspace state re-synchronised from storage.');
      appendLog('info', 'Workspace state restored from local storage snapshot');
    } catch (error) {
      console.error('[devtools] Failed to resync workspace state', error);
      appendLog('error', 'Workspace state resync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [appendLog]);

  const reconnectCollaborationSocket = useCallback(() => {
    void syncClient.connect().catch((error) => {
      console.error('[devtools] Failed to reconnect collaboration socket', error);
      appendLog('error', 'Collaboration socket reconnect failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
    appendLog('info', 'Collaboration socket reconnect requested');
  }, [appendLog, syncClient]);

  const reinitializeWebSockets = useCallback(() => {
    void (async () => {
      try {
        await syncClient.disconnect();
        await syncClient.connect();
        console.info('[devtools] WebSocket connections reinitialised.');
        appendLog('info', 'WebSocket connections reinitialised');
      } catch (error) {
        console.error('[devtools] Failed to reinitialise websockets', error);
        appendLog('error', 'Websocket reinitialisation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, [appendLog, syncClient]);

  const runStateInspector = useCallback(() => {
    const snapshot = useAppStore.getState();
    console.group('[devtools] Raw state inspector');
    console.log(snapshot);
    console.groupEnd();
    appendLog('info', 'State inspector exported to console');
  }, [appendLog]);

  const commands = useMemo<Command[]>(
    () => [
      { id: 'dev-open', name: 'Open Dev Console', category: 'Dev Console Controls', action: openDevConsole },
      { id: 'dev-close', name: 'Close Dev Console', category: 'Dev Console Controls', action: closeDevConsole },
      { id: 'dev-toggle', name: 'Toggle Dev Console', category: 'Dev Console Controls', action: toggleDevConsole },
      {
        id: 'presence-show',
        name: 'Show Presence Debug Layer',
        category: 'Collaboration & Presence',
        action: showPresenceLayer,
      },
      {
        id: 'presence-hide',
        name: 'Hide Presence Debug Layer',
        category: 'Collaboration & Presence',
        action: hidePresenceLayer,
      },
      {
        id: 'presence-reconnect',
        name: 'Reconnect Collaboration Socket',
        category: 'Collaboration & Presence',
        action: reconnectCollaborationSocket,
      },
      {
        id: 'presence-resync',
        name: 'Resync Workspace State (CRDT)',
        category: 'Collaboration & Presence',
        action: resyncWorkspaceState,
      },
      {
        id: 'cache-flush',
        name: 'Flush Local Request Cache',
        category: 'Network & Caching',
        action: flushLocalRequestCache,
      },
      {
        id: 'cache-refresh-env',
        name: 'Refresh Environment Variables',
        category: 'Network & Caching',
        action: refreshEnvironmentVariables,
      },
      {
        id: 'cache-reinit-ws',
        name: 'Reinitialize WebSocket Connections',
        category: 'Network & Caching',
        action: reinitializeWebSockets,
      },
      {
        id: 'nav-control-center',
        name: 'Go to Control Center',
        category: 'Navigation',
        action: () => onNavigate('/dashboard'),
      },
      {
        id: 'nav-workspace-root',
        name: 'Go to Current Workspace Root',
        category: 'Navigation',
        action: () => onNavigate('/'),
      },
      {
        id: 'nav-profile',
        name: 'Go to My Profile',
        category: 'Navigation',
        action: () => onNavigate('/settings'),
      },
      {
        id: 'fps-show',
        name: 'Show Paint/Render FPS Overlay',
        category: 'UI Debug Tools',
        action: showFpsLayer,
      },
      {
        id: 'fps-hide',
        name: 'Hide Paint/Render FPS Overlay',
        category: 'UI Debug Tools',
        action: hideFpsLayer,
      },
      {
        id: 'easter-squirrel-glow',
        name: 'Enable Squirrel Mode UI Glow Trail',
        category: 'Easter Egg',
        description: 'Adds a subtle glowing trail that follows the cursor.',
        action: () => setTrailEnabled(true),
        hidden: true,
        activationKeyword: 'nuts',
      },
      {
        id: 'easter-state-inspector',
        name: 'Open Raw State Inspector',
        category: 'Easter Egg',
        description: 'Logs the full application state snapshot to the console.',
        action: runStateInspector,
        hidden: true,
        activationKeyword: 'debug',
      },
    ],
    [
      closeDevConsole,
      flushLocalRequestCache,
      hideFpsLayer,
      hidePresenceLayer,
      appendLog,
      onNavigate,
      openDevConsole,
      reconnectCollaborationSocket,
      refreshEnvironmentVariables,
      reinitializeWebSockets,
      resyncWorkspaceState,
      runStateInspector,
      showFpsLayer,
      showPresenceLayer,
      toggleDevConsole,
    ],
  );

  const palette = useCommandPalette(commands, {
    enabled: isAuthorized,
    onCommand: (command) => {
      console.info('[devtools] Command executed', command.id);
      appendLog('info', `Command executed · ${command.name}`, { commandId: command.id });
    },
  });

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.code === 'Backquote') {
        event.preventDefault();
        toggleDevConsole();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyP') {
        event.preventDefault();
        palette.setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAuthorized, palette, toggleDevConsole]);

  if (!isAuthorized) {
    return <>{children}</>;
  }

  const deviceId = syncClient.getDeviceId();

  useEffect(() => {
    if (devConsoleOpen) {
      appendLog('info', 'Dev console opened');
    }
  }, [appendLog, devConsoleOpen]);

  return (
    <>
      {children}
      <DevConsoleOverlay
        open={devConsoleOpen}
        onClose={closeDevConsole}
        stats={stats}
        profile={{ role, betaGroup, name: profileName }}
        syncStatus={syncStatus}
        deviceId={deviceId}
        cacheMetrics={cacheMetrics}
        logEntries={logEntries}
      />
      <CommandPalette
        open={palette.open}
        onOpenChange={palette.setOpen}
        query={palette.query}
        onQueryChange={palette.setQuery}
        groups={palette.groups}
        activeIndex={palette.activeIndex}
        onActiveIndexChange={palette.setActiveIndex}
        onSelect={palette.selectCommand}
        onInputKeyDown={palette.handleInputKeyDown}
      />
      <PresenceDebugOverlay visible={presenceVisible} peers={stats.peers} />
      <FpsOverlay visible={fpsVisible} />
      <SquirrelTrail enabled={trailEnabled} />
    </>
  );
}
