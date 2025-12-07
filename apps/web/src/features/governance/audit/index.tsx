import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Input, Label, Skeleton } from '@sdl/ui';
import { useI18n } from '../../../lib/i18n';
import { useGovernanceGet } from '../hooks/useGovernanceApi';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor?: string;
  type: string;
  region?: string;
  metadata?: Record<string, unknown>;
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  return (
    <Card className="border border-border/70 bg-background/70 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{event.type}</p>
          <p className="text-xs text-muted-foreground">{event.actor || 'system'}</p>
        </div>
        <Badge variant="outline">{new Date(event.timestamp).toLocaleString()}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{event.region || '—'}</p>
      {event.metadata ? (
        <pre className="mt-2 rounded bg-muted/50 p-2 text-xs text-foreground">{JSON.stringify(event.metadata, null, 2)}</pre>
      ) : null}
    </Card>
  );
}

export function GovernanceAuditViewer({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<{ type?: string; actor?: string; start?: string; end?: string }>({});

  const audit = useGovernanceGet<AuditEvent[]>(`/api/audit?workspaceId=${workspaceId}&category=governance`);
  const security = useGovernanceGet<AuditEvent[]>(`/api/security-events?workspaceId=${workspaceId}&category=governance`);

  useEffect(() => {
    const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/api/governance/stream?workspaceId=${workspaceId}`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (['retention.policy_updated', 'workspace.backup_created', 'workspace.legal_hold_created'].includes(payload?.type)) {
          void audit.refresh();
          void security.refresh();
        }
      } catch (err) {
        console.warn('[governance] stream parse failed', err);
      }
    };
    return () => ws.close();
  }, [audit, security, workspaceId]);

  const filterEvents = (events: AuditEvent[] | null | undefined) => {
    if (!events) return [];
    return events.filter((event) => {
      if (filters.type && !event.type.includes(filters.type)) return false;
      if (filters.actor && (event.actor || '').toLowerCase().indexOf(filters.actor.toLowerCase()) === -1) return false;
      if (filters.start && new Date(event.timestamp) < new Date(filters.start)) return false;
      if (filters.end && new Date(event.timestamp) > new Date(filters.end)) return false;
      return true;
    });
  };

  const combined = useMemo(() => [...filterEvents(audit.data), ...filterEvents(security.data)], [audit.data, security.data, filters]);

  if (audit.loading || security.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (audit.error || security.error) {
    return <p className="text-sm text-destructive">{audit.error || security.error}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{t('governance.audit.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('governance.audit.subtitle')}</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>{t('governance.audit.eventType')}</Label>
          <Input value={filters.type ?? ''} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>{t('governance.audit.actor')}</Label>
          <Input value={filters.actor ?? ''} onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>{t('governance.audit.start')}</Label>
          <Input type="date" value={filters.start ?? ''} onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>{t('governance.audit.end')}</Label>
          <Input type="date" value={filters.end ?? ''} onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))} />
        </div>
      </div>
      {combined.length > 0 ? (
        <div className="space-y-3">
          {combined.map((event) => (
            <AuditEventRow key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/70 p-6 text-center text-muted-foreground">
          {t('governance.audit.empty')}
        </Card>
      )}
    </div>
  );
}
