import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card } from '@sdl/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  fetchControlActivity,
  fetchControlHealth,
  fetchControlOverview,
  fetchControlUsers,
  promoteUser,
  demoteUser,
  setUserFrozen,
  type ControlActivityEntry,
  type ControlCenterOverview,
  type ControlCenterUser,
  type ControlHealthEntry,
} from '../lib/api/admin';
import { useBetaFlags } from '../modules/beta/useBetaFlags';
import OverlayModal from '../components/modals/OverlayModal';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'activity', label: 'Activity' },
  { id: 'health', label: 'System Health' },
] as const;

type TabId = (typeof tabs)[number]['id'];

type PendingUserAction =
  | { type: 'promote'; user: ControlCenterUser }
  | { type: 'demote'; user: ControlCenterUser }
  | { type: 'freeze'; user: ControlCenterUser; frozen: boolean };

export default function ControlCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [overview, setOverview] = useState<ControlCenterOverview | null>(null);
  const [users, setUsers] = useState<ControlCenterUser[]>([]);
  const [activity, setActivity] = useState<ControlActivityEntry[]>([]);
  const [health, setHealth] = useState<ControlHealthEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  const { profile } = useBetaFlags();

  const isFounder = profile?.role === 'founder';
  const canManageRoles = isFounder;
  const canFreeze = isFounder || profile?.role === 'admin';

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchControlOverview().catch((err) => {
        console.warn('Failed to load overview', err);
        return null;
      }),
      fetchControlUsers().catch((err) => {
        console.warn('Failed to load users', err);
        return [] as ControlCenterUser[];
      }),
      fetchControlActivity().catch((err) => {
        console.warn('Failed to load activity', err);
        return [] as ControlActivityEntry[];
      }),
      fetchControlHealth().catch((err) => {
        console.warn('Failed to load health', err);
        return [] as ControlHealthEntry[];
      }),
    ])
      .then(([overviewData, usersData, activityData, healthData]) => {
        setOverview(overviewData);
        setUsers(usersData);
        setActivity(activityData);
        setHealth(healthData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load control center');
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        if (a.role === b.role) return a.email.localeCompare(b.email);
        return a.role.localeCompare(b.role);
      }),
    [users],
  );

  const refreshUsers = async () => {
    const refreshed = await fetchControlUsers();
    setUsers(refreshed);
  };

  const runUserAction = async (operation: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await operation();
    } catch (err) {
      console.error('Control center action failed', err);
      setError(err instanceof Error ? err.message : 'Unable to complete action');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (userId: string) => {
    await runUserAction(async () => {
      await promoteUser(userId);
      await refreshUsers();
    });
  };

  const handleDemote = async (userId: string) => {
    await runUserAction(async () => {
      await demoteUser(userId);
      await refreshUsers();
    });
  };

  const handleFreeze = async (userId: string, frozen: boolean) => {
    await runUserAction(async () => {
      await setUserFrozen(userId, frozen);
      await refreshUsers();
    });
  };

  const requestPromote = (user: ControlCenterUser) => setPendingAction({ type: 'promote', user });
  const requestDemote = (user: ControlCenterUser) => setPendingAction({ type: 'demote', user });
  const requestFreeze = (user: ControlCenterUser, frozen: boolean) => {
    if (frozen) {
      setPendingAction({ type: 'freeze', user, frozen });
      return;
    }
    void handleFreeze(user.id, frozen);
  };

  const executePendingAction = async () => {
    if (!pendingAction) {
      return;
    }
    setPendingBusy(true);
    try {
      if (pendingAction.type === 'promote') {
        await handlePromote(pendingAction.user.id);
      } else if (pendingAction.type === 'demote') {
        await handleDemote(pendingAction.user.id);
      } else if (pendingAction.type === 'freeze') {
        await handleFreeze(pendingAction.user.id, pendingAction.frozen);
      }
      setPendingAction(null);
    } finally {
      setPendingBusy(false);
    }
  };

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Control</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Founder Control Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Monitor platform health, guide collaborators, and manage privileged access. All sensitive actions are audited for
            safety and transparency.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-[0_12px_40px_-28px_rgba(220,38,38,0.65)] transition dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card
          className="glass-panel flex h-fit flex-col gap-2 border border-border/60 bg-background/80 p-4 shadow-sm"
          role="tablist"
          aria-label="Control center sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                activeTab === tab.id
                  ? 'bg-accent/10 text-foreground shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                  : 'text-muted hover:bg-accent/5 hover:text-foreground'
              }`}
              aria-current={activeTab === tab.id}
              aria-controls={`control-center-${tab.id}`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && <span className="text-[11px] uppercase tracking-[0.3em] text-accent">Active</span>}
            </button>
          ))}
        </Card>

        <div className="space-y-8">
          {activeTab === 'overview' && (
            <OverviewPanel loading={loading} overview={overview} panelId="control-center-overview" />
          )}
          {activeTab === 'users' && (
            <UsersPanel
              users={sortedUsers}
              loading={loading}
              canManageRoles={canManageRoles}
              canFreeze={canFreeze}
              onRequestPromote={requestPromote}
              onRequestDemote={requestDemote}
              onRequestFreeze={requestFreeze}
              panelId="control-center-users"
            />
          )}
          {activeTab === 'activity' && (
            <ActivityPanel entries={activity} loading={loading} panelId="control-center-activity" />
          )}
          {activeTab === 'health' && <HealthPanel entries={health} loading={loading} panelId="control-center-health" />}
        </div>
      </div>

      <ConfirmUserActionModal
        pending={pendingAction}
        onCancel={() => {
          if (!pendingBusy) {
            setPendingAction(null);
          }
        }}
        onConfirm={executePendingAction}
        busy={pendingBusy}
      />
    </section>
  );
}

function OverviewPanel({
  loading,
  overview,
  panelId,
}: {
  loading: boolean;
  overview: ControlCenterOverview | null;
  panelId: string;
}) {
  const headingId = `${panelId}-heading`;
  if (loading && !overview) {
    return (
      <Card id={panelId} className="glass-panel border border-border/50 bg-background/80 p-6" aria-live="polite">
        Loading overview…
      </Card>
    );
  }
  if (!overview) {
    return (
      <Card id={panelId} className="glass-panel border border-border/50 bg-background/80 p-6" aria-live="polite">
        Overview data unavailable.
      </Card>
    );
  }

  const uptimeHuman = formatDistanceToNow(Date.now() - overview.uptimeSeconds * 1000, { addSuffix: false });
  const errorRatePercent = `${(overview.errorRate * 100).toFixed(2)}%`;
  const errorCallout =
    overview.errorRate > 0.05
      ? 'Error budget exceeded — page SRE on-call and throttle risky deploys.'
      : 'Healthy: within budget but continue to watch for regressions.';

  return (
    <Card
      id={panelId}
      className="glass-panel border border-border/50 bg-background/80 p-6 shadow-sm"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="text-lg font-semibold tracking-tight text-foreground">
        Platform snapshot
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile label="Uptime" value={uptimeHuman} description="Process uptime" />
        <MetricTile label="Release" value={overview.version} description="Current deployment version" />
        <MetricTile label="Error rate" value={errorRatePercent} description="HTTP error ratio" emphasize={overview.errorRate > 0.05} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border/50 bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Operational summary</p>
          <p className="mt-2 text-sm text-foreground">
            {overview.uptimeSeconds > 86_400
              ? 'Runtime is stable past 24h; deploys can proceed with normal guardrails.'
              : 'Recent restart detected; keep deploys minimal while stability is confirmed.'}
          </p>
          <p className="mt-1 text-xs text-muted">{errorCallout}</p>
        </div>
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-900 dark:text-amber-50">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin reminders</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>Freeze or demote accounts before sensitive maintenance windows.</li>
            <li>Use activity feed to confirm privileged actions before granting control.</li>
            <li>Escalations should pair with takeover logging in the founder panel.</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  description,
  emphasize,
}: {
  label: string;
  value: string;
  description: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 transition ${
        emphasize ? 'border-red-400 bg-red-50/60 dark:border-red-500/60 dark:bg-red-500/10' : 'border-border/50 bg-background/70'
      }`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </div>
  );
}

function UsersPanel({
  users,
  loading,
  canManageRoles,
  canFreeze,
  onRequestPromote,
  onRequestDemote,
  onRequestFreeze,
  panelId,
}: {
  users: ControlCenterUser[];
  loading: boolean;
  canManageRoles: boolean;
  canFreeze: boolean;
  onRequestPromote: (user: ControlCenterUser) => void;
  onRequestDemote: (user: ControlCenterUser) => void;
  onRequestFreeze: (user: ControlCenterUser, frozen: boolean) => void;
  panelId: string;
}) {
  const roleStyles: Record<string, { label: string; variant: 'outline' | 'secondary' | 'success' | 'destructive' }> = {
    owner: { label: 'Owner', variant: 'success' },
    admin: { label: 'Admin', variant: 'secondary' },
    user: { label: 'Member', variant: 'outline' },
  };

  return (
    <Card id={panelId} className="glass-panel border border-border/50 bg-background/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Workspace users</h2>
          <p className="text-xs text-muted">Review access tiers and manage operational safety.</p>
        </div>
        {loading && <span className="text-xs text-muted" aria-live="polite">Refreshing…</span>}
      </div>
      <div className="mt-6 space-y-4">
        <div className="h-px bg-border/60" aria-hidden />
        <div className="overflow-x-auto rounded-xl border border-border/50 shadow-sm">
          <table className="min-w-full divide-y divide-border/40 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.3em] text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {users.map((user) => {
              const lastSeen = user.lastSeenAt
                ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })
                : 'Unknown';
              const isOwner = user.role === 'owner';
              const isAdmin = user.role === 'admin';
              const roleMeta = roleStyles[user.role] ?? roleStyles.user;
              return (
                <tr
                  key={user.id}
                  className="group text-sm transition-colors hover:bg-accent/5 focus-within:bg-accent/5"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{user.email}</td>
                  <td className="px-4 py-3 capitalize text-muted">
                    <Badge variant={roleMeta.variant} size="sm" className="rounded-full px-2.5 py-0.5 text-xs">
                      {roleMeta.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{lastSeen}</td>
                  <td className="px-4 py-3">
                    {user.accountFrozen ? (
                      <Badge variant="destructive" size="sm" className="rounded-full px-2.5 py-0.5 text-xs">
                        Frozen
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm" className="rounded-full px-2.5 py-0.5 text-xs">
                        Active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {canManageRoles && !isOwner && (
                        isAdmin ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onRequestDemote(user)}
                            aria-label={`Demote ${user.email} to user`}
                          >
                            Demote to user
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onRequestPromote(user)}
                            aria-label={`Promote ${user.email} to admin`}
                          >
                            Promote to admin
                          </Button>
                        )
                      )}
                      {canFreeze && !isOwner && (
                        user.accountFrozen ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => onRequestFreeze(user, false)}
                            aria-label={`Unfreeze ${user.email}`}
                          >
                            Unfreeze
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => onRequestFreeze(user, true)}
                            aria-label={`Freeze ${user.email}`}
                          >
                            Freeze
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-muted" colSpan={5}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function ActivityPanel({
  entries,
  loading,
  panelId,
}: {
  entries: ControlActivityEntry[];
  loading: boolean;
  panelId: string;
}) {
  return (
    <Card id={panelId} className="glass-panel border border-border/50 bg-background/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent activity</h2>
        {loading && <span className="text-xs text-muted">Refreshing…</span>}
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border/40 bg-background/70 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="uppercase tracking-[0.3em]">{entry.type}</span>
              <span>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{renderActivityDetail(entry)}</p>
          </div>
        ))}
        {entries.length === 0 && !loading && (
          <p className="text-sm text-muted">Activity will appear as teammates collaborate.</p>
        )}
      </div>
    </Card>
  );
}

function renderActivityDetail(entry: ControlActivityEntry): string {
  if (entry.type === 'audit') {
    const detail = entry.detail as { action?: string; targetId?: string } | undefined;
    const action = detail?.action ?? 'Action';
    const target = detail?.targetId ? ` for ${detail.targetId}` : '';
    return `${action}${target}`;
  }
  if (entry.type === 'request') {
    const detail = entry.detail as { status?: string; responseCode?: number; requestId?: string } | undefined;
    const status = detail?.status ?? 'REQUEST';
    const response = detail?.responseCode ? ` (${detail.responseCode})` : '';
    return `${status}${response} · ${detail?.requestId ?? 'request'}`;
  }
  return 'Activity recorded';
}

function HealthPanel({
  entries,
  loading,
  panelId,
}: {
  entries: ControlHealthEntry[];
  loading: boolean;
  panelId: string;
}) {
  return (
    <Card id={panelId} className="glass-panel border border-border/50 bg-background/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">System health</h2>
        {loading && <span className="text-xs text-muted">Refreshing…</span>}
      </div>
      <div className="mt-4 space-y-2">
        {entries.map((entry) => (
          <div key={entry.component} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
            <div className="flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  entry.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span className="font-medium text-foreground capitalize">{entry.component}</span>
            </div>
            <span className="text-xs text-muted">{entry.detail ?? (entry.status === 'up' ? 'Operational' : 'Check logs')}</span>
          </div>
        ))}
        {entries.length === 0 && !loading && (
          <p className="text-sm text-muted">Health data is unavailable.</p>
        )}
      </div>
    </Card>
  );
}

function ConfirmUserActionModal({
  pending,
  onCancel,
  onConfirm,
  busy,
}: {
  pending: PendingUserAction | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  busy: boolean;
}) {
  if (!pending) {
    return null;
  }

  const actionCopy = {
    title:
      pending.type === 'promote'
        ? 'Promote to administrator'
        : pending.type === 'demote'
        ? 'Revoke administrator access'
        : pending.frozen
        ? 'Freeze account access'
        : 'Update account status',
    description:
      pending.type === 'promote'
        ? 'Grant elevated permissions to help this teammate manage workspace configuration and audits.'
        : pending.type === 'demote'
        ? 'Downgrade this teammate to a standard member. They will lose access to administrative tooling immediately.'
        : 'Freeze this account to suspend access. This can be reversed later from the same panel.',
    confirmLabel:
      pending.type === 'promote'
        ? 'Confirm promotion'
        : pending.type === 'demote'
        ? 'Confirm demotion'
        : 'Freeze user',
  };

  return (
    <OverlayModal
      isOpen
      onClose={onCancel}
      title={actionCopy.title}
      description={`Action for ${pending.user.email}`}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy} aria-label="Cancel action">
            Cancel
          </Button>
          <Button
            variant={pending.type === 'promote' ? 'primary' : 'outline'}
            className={
              pending.type === 'promote'
                ? undefined
                : 'border-red-500/60 text-red-600 hover:bg-red-500/10 dark:border-red-500/40 dark:text-red-200'
            }
            onClick={() => void onConfirm()}
            disabled={busy}
            aria-label={actionCopy.confirmLabel}
          >
            {busy ? 'Working…' : actionCopy.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">
        {actionCopy.description}{' '}
        <span className="font-medium text-foreground">This event is logged for compliance.</span>
      </p>
    </OverlayModal>
  );
}
