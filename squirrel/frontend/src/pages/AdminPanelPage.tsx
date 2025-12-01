import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card } from '@sdl/ui';
import { formatDistanceToNow } from 'date-fns';
import {
  adjustAdminCredits,
  fetchAdminBilling,
  fetchAdminLogs,
  fetchAdminSessions,
  fetchAdminSystemHealth,
  fetchAdminUsers,
  requestSessionTakeover,
  updateAdminUserRole,
  type AdminBillingSnapshot,
  type AdminLogEntry,
  type AdminSessionSnapshot,
  type AdminSystemHealthEntry,
  type AdminUser,
} from '../lib/api/founderPanel';
import { useBetaFlags } from '../modules/beta/useBetaFlags';

const sections = [
  { id: 'overview', label: 'Overview / System health' },
  { id: 'users', label: 'Users & Roles' },
  { id: 'logs', label: 'Logs' },
  { id: 'billing', label: 'Billing & Usage' },
  { id: 'sessions', label: 'Sessions & Takeover' },
] as const;

type SectionId = (typeof sections)[number]['id'];

type LogTab = 'requests' | 'errors' | 'ai';

function stringifyDetail(detail: unknown) {
  if (!detail) {
    return '—';
  }
  if (typeof detail === 'string') {
    return detail;
  }
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

function roleLabel(roles?: string[]) {
  if (!roles || roles.length === 0) {
    return 'user';
  }
  if (roles.includes('founder')) {
    return 'founder';
  }
  if (roles.includes('admin')) {
    return 'admin';
  }
  return roles[0];
}

function takeoverModeFromState(state: AdminSessionSnapshot['takeoverState']): string {
  if (!state || typeof state !== 'object') {
    return 'VIEW_ONLY';
  }
  const mode = (state as Record<string, unknown>).mode;
  if (typeof mode === 'string') {
    return mode.toUpperCase();
  }
  return 'VIEW_ONLY';
}

function takeoverMeta(state: AdminSessionSnapshot['takeoverState']) {
  if (!state || typeof state !== 'object') {
    return { targetUserId: null as string | null, expiresAt: null as string | null };
  }
  const meta = state as Record<string, unknown>;
  return {
    targetUserId: typeof meta.targetUserId === 'string' ? meta.targetUserId : null,
    expiresAt: typeof meta.expiresAt === 'string' ? meta.expiresAt : null,
  };
}

export default function AdminPanelPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [health, setHealth] = useState<AdminSystemHealthEntry[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [logTab, setLogTab] = useState<LogTab>('requests');
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [billingUserId, setBillingUserId] = useState('');
  const [billing, setBilling] = useState<AdminBillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [creditDelta, setCreditDelta] = useState('0');
  const [creditReason, setCreditReason] = useState('');

  const [sessions, setSessions] = useState<AdminSessionSnapshot[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { profile } = useBetaFlags();
  const canAccess = profile?.role === 'founder' || profile?.role === 'admin';

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await fetchAdminSystemHealth();
      setHealth(data);
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : 'Failed to load health data');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (search?: string) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await fetchAdminUsers(search);
      setUsers(data);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (tab: LogTab) => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await fetchAdminLogs(tab);
      setLogs(data);
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await fetchAdminSessions();
      setSessions(data);
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    void loadHealth();
    void loadUsers();
    void loadSessions();
  }, [canAccess, loadHealth, loadSessions, loadUsers]);

  useEffect(() => {
    if (!canAccess) {
      return;
    }
    void loadLogs(logTab);
  }, [canAccess, loadLogs, logTab]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  const sortedHealth = useMemo(() => {
    return [...health].sort((a, b) => a.service.localeCompare(b.service));
  }, [health]);

  const sessionStats = useMemo(() => {
    const total = sessions.length;
    const elevated = sessions.filter((session) => takeoverModeFromState(session.takeoverState) !== 'VIEW_ONLY').length;
    const expiringSoon = sessions.filter((session) => {
      const { expiresAt } = takeoverMeta(session.takeoverState);
      if (!expiresAt) return false;
      const expires = new Date(expiresAt).getTime();
      return Number.isFinite(expires) && expires - Date.now() < 10 * 60 * 1000;
    }).length;
    return { total, elevated, expiringSoon };
  }, [sessions]);

  const handleRoleChange = async (userId: string, role: string) => {
    setActionMessage(null);
    try {
      await updateAdminUserRole(userId, role);
      await loadUsers(userSearch || undefined);
      setActionMessage(`Updated role for ${userId} to ${role}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to update role');
    }
  };

  const handleBillingLookup = async (event: FormEvent) => {
    event.preventDefault();
    if (!billingUserId.trim()) {
      setBilling(null);
      return;
    }
    setBillingLoading(true);
    setBillingError(null);
    try {
      const snapshot = await fetchAdminBilling(billingUserId.trim());
      setBilling(snapshot);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Failed to load billing');
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCreditAdjust = async (event: FormEvent) => {
    event.preventDefault();
    if (!billing) {
      return;
    }
    const amount = Number(creditDelta);
    if (Number.isNaN(amount) || amount === 0) {
      setActionMessage('Provide a non-zero credit adjustment.');
      return;
    }
    setActionMessage(null);
    try {
      await adjustAdminCredits(billing.userId, amount, creditReason || undefined);
      const refreshed = await fetchAdminBilling(billing.userId);
      setBilling(refreshed);
      setCreditDelta('0');
      setCreditReason('');
      setActionMessage(`Adjusted credits by ${amount} for ${billing.userId}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to adjust credits');
    }
  };

  const handleSessionTakeover = async (sessionId: string) => {
    setActionMessage(null);
    try {
      await requestSessionTakeover(sessionId, 'Gateway initiated takeover for live debugging');
      await loadSessions();
      setActionMessage(`Takeover requested for session ${sessionId}`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to request takeover');
    }
  };

  if (!canAccess) {
    return (
      <Card className="rounded-2xl border border-border/40 bg-background/80 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Restricted area</h1>
        <p className="mt-3 text-sm text-muted">
          This panel is limited to founders and admins. Contact the platform team if you need elevated access.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Founder operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Founder / Admin Command Panel</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Monitor microservice health, inspect user access, debug live sessions, and manage billing with full audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">RBAC enforced</Badge>
          <Badge variant="outline">Audit logging enabled</Badge>
        </div>
      </div>

      {actionMessage && (
        <Card className="border border-border/40 bg-background/80 p-4 text-sm text-muted">
          {actionMessage}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="glass-panel flex h-fit flex-col gap-2 border border-border/60 bg-background/80 p-4 shadow-sm" role="tablist">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                activeSection === section.id
                  ? 'bg-accent/10 text-foreground shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                  : 'text-muted hover:bg-accent/5 hover:text-foreground'
              }`}
              aria-current={activeSection === section.id}
            >
              <span>{section.label}</span>
            </button>
          ))}
        </Card>

        <div className="space-y-10">
          {activeSection === 'overview' && (
            <Card className="space-y-6 border border-border/50 bg-background/80 p-6" id="admin-overview">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">System health</h2>
                  <p className="text-sm text-muted">Aggregated heartbeat status across core microservices and infrastructure.</p>
                </div>
                <Button variant="subtle" onClick={() => loadHealth()} disabled={healthLoading}>
                  Refresh
                </Button>
              </div>
              {healthError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{healthError}</div>}
              <div className="overflow-hidden rounded-xl border border-border/40">
                <table className="w-full text-left text-sm">
                  <thead className="bg-foreground/5 text-xs uppercase tracking-[0.3em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Latency</th>
                      <th className="px-4 py-3">Checked</th>
                      <th className="px-4 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHealth.map((entry) => (
                      <tr key={entry.service} className="border-t border-border/30">
                        <td className="px-4 py-3 font-medium text-foreground">{entry.service}</td>
                        <td className="px-4 py-3">
                          <Badge variant={entry.status === 'up' ? 'success' : entry.status === 'down' ? 'destructive' : 'outline'}>
                            {entry.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">{entry.latencyMs != null ? `${entry.latencyMs} ms` : '—'}</td>
                        <td className="px-4 py-3 text-muted">
                          {entry.checkedAt ? formatDistanceToNow(new Date(entry.checkedAt), { addSuffix: true }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-xs text-muted">{stringifyDetail(entry.detail)}</pre>
                        </td>
                      </tr>
                    ))}
                    {sortedHealth.length === 0 && !healthLoading && (
                      <tr>
                        <td className="px-4 py-3 text-sm text-muted" colSpan={5}>
                          No health data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeSection === 'users' && (
            <Card className="space-y-6 border border-border/50 bg-background/80 p-6" id="admin-users">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Users &amp; roles</h2>
                  <p className="text-sm text-muted">Search for accounts and elevate or downgrade access with instant auditing.</p>
                </div>
                <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void loadUsers(userSearch || undefined); }}>
                  <input
                    type="search"
                    className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground"
                    placeholder="Search email or id"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                  />
                  <Button type="submit" variant="primary" disabled={usersLoading}>
                    Search
                  </Button>
                </form>
              </div>
              {usersError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{usersError}</div>}
              <div className="overflow-hidden rounded-xl border border-border/40">
                <table className="w-full text-left text-sm">
                  <thead className="bg-foreground/5 text-xs uppercase tracking-[0.3em] text-muted">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Active workspace</th>
                      <th className="px-4 py-3">Last seen</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user) => (
                      <tr key={user.id} className="border-t border-border/30">
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-sm">
                            <span className="font-medium text-foreground">{user.displayName ?? user.email}</span>
                            <span className="text-xs text-muted">{user.email}</span>
                            <span className="text-xs text-muted">ID: {user.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{roleLabel(user.roles)}</td>
                        <td className="px-4 py-3 text-sm text-muted">{user.activeWorkspaceId ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {user.lastActiveAt
                            ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {['user', 'pro', 'admin', 'founder'].map((role) => (
                              <Button
                                key={role}
                                size="xs"
                                variant={roleLabel(user.roles) === role ? 'subtle' : 'outline'}
                                onClick={() => void handleRoleChange(user.id, role)}
                                disabled={usersLoading}
                              >
                                {role}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sortedUsers.length === 0 && !usersLoading && (
                      <tr>
                        <td className="px-4 py-3 text-sm text-muted" colSpan={5}>
                          No users found. Try a different search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeSection === 'logs' && (
            <Card className="space-y-6 border border-border/50 bg-background/80 p-6" id="admin-logs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Platform logs</h2>
                  <p className="text-sm text-muted">Inspect requests, error telemetry, and AI orchestration traces.</p>
                </div>
                <div className="flex gap-2">
                  {(['requests', 'errors', 'ai'] as LogTab[]).map((tab) => (
                    <Button
                      key={tab}
                      variant={logTab === tab ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLogTab(tab)}
                    >
                      {tab}
                    </Button>
                  ))}
                  <Button variant="subtle" size="sm" onClick={() => loadLogs(logTab)} disabled={logsLoading}>
                    Refresh
                  </Button>
                </div>
              </div>
              {logsError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{logsError}</div>}
              <div className="overflow-hidden rounded-xl border border-border/40">
                <table className="w-full text-left text-sm">
                  <thead className="bg-foreground/5 text-xs uppercase tracking-[0.3em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((entry, index) => (
                      <tr key={entry.id ?? `${entry.timestamp}-${index}`} className="border-t border-border/30">
                        <td className="px-4 py-3 text-sm text-muted">
                          {entry.timestamp
                            ? formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{entry.level ?? 'info'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{entry.message ?? '—'}</td>
                        <td className="px-4 py-3">
                          <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-xs text-muted">{stringifyDetail(entry.metadata)}</pre>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && !logsLoading && (
                      <tr>
                        <td className="px-4 py-3 text-sm text-muted" colSpan={4}>
                          No log entries available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeSection === 'billing' && (
            <Card className="space-y-6 border border-border/50 bg-background/80 p-6" id="admin-billing">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Billing &amp; usage</h2>
                  <p className="text-sm text-muted">Inspect subscription tier, credits, and usage for a specific account.</p>
                </div>
              </div>
              <form className="flex flex-wrap items-center gap-3" onSubmit={handleBillingLookup}>
                <input
                  type="text"
                  className="min-w-[220px] rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground"
                  placeholder="User ID"
                  value={billingUserId}
                  onChange={(event) => setBillingUserId(event.target.value)}
                />
                <Button type="submit" variant="primary" disabled={billingLoading}>
                  Lookup
                </Button>
              </form>
              {billingError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{billingError}</div>}
              {billing && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="space-y-4 border border-border/40 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Plan</p>
                    <p className="text-2xl font-semibold text-foreground">{billing.plan ?? 'Unknown'}</p>
                    <p className="text-sm text-muted">User ID: {billing.userId}</p>
                  </Card>
                  <Card className="space-y-4 border border-border/40 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Credits</p>
                    <p className="text-2xl font-semibold text-foreground">{billing.credits ?? 0}</p>
                    <p className="text-sm text-muted">Adjust credits with justification for audit compliance.</p>
                  </Card>
                  <Card className="md:col-span-2 space-y-4 border border-border/40 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Usage snapshot</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted">{stringifyDetail(billing.usage)}</pre>
                  </Card>
                </div>
              )}
              {billing && (
                <form className="flex flex-wrap items-center gap-3" onSubmit={handleCreditAdjust}>
                  <input
                    type="number"
                    className="min-w-[140px] rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground"
                    value={creditDelta}
                    onChange={(event) => setCreditDelta(event.target.value)}
                  />
                  <input
                    type="text"
                    className="min-w-[220px] flex-1 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground"
                    placeholder="Reason (optional)"
                    value={creditReason}
                    onChange={(event) => setCreditReason(event.target.value)}
                  />
                  <Button type="submit" variant="outline">
                    Adjust credits
                  </Button>
                </form>
              )}
            </Card>
          )}

          {activeSection === 'sessions' && (
            <Card className="space-y-6 border border-border/50 bg-background/80 p-6" id="admin-sessions">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Live sessions</h2>
                  <p className="text-sm text-muted">
                    Observe real-time collaboration sessions and initiate controlled takeovers for debugging support. Takeovers
                    are fully audited and auto-expire when escalated.
                  </p>
                </div>
                <Button variant="subtle" onClick={() => loadSessions()} disabled={sessionsLoading}>
                  Refresh
                </Button>
              </div>
              {sessionsError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{sessionsError}</div>}
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border border-border/50 bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Active sessions</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{sessionStats.total}</p>
                  <p className="text-xs text-muted">Connected websockets reporting live activity.</p>
                </Card>
                <Card className="border border-border/50 bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Elevated modes</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{sessionStats.elevated}</p>
                  <p className="text-xs text-muted">Currently beyond view-only control.</p>
                </Card>
                <Card className="border border-border/50 bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Expiring soon</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{sessionStats.expiringSoon}</p>
                  <p className="text-xs text-muted">Override windows ending &lt; 10 minutes.</p>
                </Card>
              </div>
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                Use view-only to observe, co-control when you need paired debugging, and emergency override only for incidents. All
                requests notify collaborators and emit takeover logs.
              </div>
              <div className="overflow-hidden rounded-xl border border-border/40">
                <table className="w-full text-left text-sm">
                  <thead className="bg-foreground/5 text-xs uppercase tracking-[0.3em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Session</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Workspace</th>
                      <th className="px-4 py-3">Connected</th>
                      <th className="px-4 py-3">Takeover</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.sessionId} className="border-t border-border/30">
                        <td className="px-4 py-3 text-sm text-foreground">{session.sessionId}</td>
                        <td className="px-4 py-3 text-sm text-muted">
                          <div className="flex flex-col">
                            <span>{session.userEmail ?? session.userId ?? 'Unknown'}</span>
                            {session.userId && <span className="text-xs text-muted">{session.userId}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{session.workspaceId ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {session.connectedAt
                            ? formatDistanceToNow(new Date(session.connectedAt), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {(() => {
                            const mode = takeoverModeFromState(session.takeoverState);
                            const { targetUserId, expiresAt } = takeoverMeta(session.takeoverState);
                            const expiresLabel = expiresAt
                              ? formatDistanceToNow(new Date(expiresAt), { addSuffix: true })
                              : null;
                            const badgeVariant =
                              mode === 'EMERGENCY_OVERRIDE' ? 'destructive' : mode === 'CO_CONTROL' ? 'secondary' : 'outline';
                            return (
                              <div className="space-y-1">
                                <Badge variant={badgeVariant} size="sm" className="rounded-full px-2.5 py-0.5 text-xs">
                                  {mode.replace('_', ' ')}
                                </Badge>
                                <p className="text-xs text-muted">{targetUserId ? `Target: ${targetUserId}` : 'Passive view-only'}</p>
                                {expiresLabel && <p className="text-[11px] text-muted">Expires {expiresLabel}</p>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleSessionTakeover(session.sessionId)}
                            disabled={sessionsLoading}
                          >
                            Request takeover
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && !sessionsLoading && (
                      <tr>
                        <td className="px-4 py-3 text-sm text-muted" colSpan={6}>
                          No active sessions detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
