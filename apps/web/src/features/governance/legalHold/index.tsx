import { useEffect, useState } from 'react';
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Skeleton, Textarea } from '@sdl/ui';
import axios from 'axios';
import { can } from '@sdl/frontend/utils/roles';
import { useAuth } from '../../../modules/auth/AuthProvider';
import { useI18n } from '../../../lib/i18n';
import { useGovernanceGet } from '../hooks/useGovernanceApi';

interface LegalHold {
  id: string;
  name: string;
  reason?: string;
  status: 'ACTIVE' | 'RELEASED';
  scope?: 'ORG' | 'WORKSPACE';
  createdAt: string;
  releasedAt?: string;
  region?: string;
}

function CreateLegalHoldModal({ open, onOpenChange, workspaceId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string; onCreated: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await axios.post('/api/legal-hold', { workspaceId, name, reason });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('governance.legalHold.create')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="legalHoldName">{t('governance.legalHold.name')}</Label>
            <Input id="legalHoldName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="legalHoldReason">{t('governance.legalHold.reason')}</Label>
            <Textarea id="legalHoldReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting || !name}>
            {submitting ? t('common.loading') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseLegalHoldModal({ open, onOpenChange, holdId, onReleased }: { open: boolean; onOpenChange: (open: boolean) => void; holdId: string | null; onReleased: () => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!holdId) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.patch(`/api/legal-hold/${holdId}/release`, { reason });
      onReleased();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('governance.legalHold.release')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="releaseReason">{t('governance.legalHold.releaseReason')}</Label>
          <Textarea id="releaseReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting || !reason}>
            {submitting ? t('common.loading') : t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegalHoldCard({ hold, onRelease }: { hold: LegalHold; onRelease: (id: string) => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const canRelease = can(user, 'legalhold:release') && hold.status === 'ACTIVE';

  return (
    <Card className="border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{hold.name}</p>
          <p className="text-xs text-muted-foreground">{hold.reason}</p>
        </div>
        <div className="space-x-2">
          <Badge variant="outline">{hold.status}</Badge>
          {hold.scope === 'ORG' ? <Badge variant="secondary">{t('governance.legalHold.orgWide')}</Badge> : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t('governance.legalHold.region')}: {hold.region || '—'}</p>
      {canRelease ? (
        <Button className="mt-3" size="sm" variant="outline" onClick={() => onRelease(hold.id)}>
          {t('governance.legalHold.release')}
        </Button>
      ) : null}
    </Card>
  );
}

export function LegalHoldPanel({ workspaceId, orgId }: { workspaceId: string; orgId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const workspaceHolds = useGovernanceGet<LegalHold[]>(`/api/legal-hold/workspace/${workspaceId}`);
  const orgHolds = useGovernanceGet<LegalHold[]>(`/api/legal-hold/organization/${orgId}`);
  const [creating, setCreating] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);

  const canCreate = can(user, 'legalhold:create');

  useEffect(() => {
    const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/api/governance/stream?workspaceId=${workspaceId}`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (['workspace.legal_hold_created', 'workspace.legal_hold_released'].includes(payload?.type)) {
          void workspaceHolds.refresh();
        }
      } catch (err) {
        console.warn('[governance] stream parse failed', err);
      }
    };
    return () => ws.close();
  }, [workspaceHolds, workspaceId]);

  if (workspaceHolds.loading || orgHolds.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (workspaceHolds.error || orgHolds.error) {
    return <p className="text-sm text-destructive">{workspaceHolds.error || orgHolds.error}</p>;
  }

  const activeWorkspaceHold = workspaceHolds.data?.find((h) => h.status === 'ACTIVE');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('governance.legalHold.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('governance.legalHold.subtitle')}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)} disabled={Boolean(activeWorkspaceHold)}>
            {t('governance.legalHold.create')}
          </Button>
        ) : null}
      </div>
      <div className="space-y-3">
        {(workspaceHolds.data ?? []).map((hold) => (
          <LegalHoldCard key={hold.id} hold={hold} onRelease={setReleasing} />
        ))}
        {(orgHolds.data ?? []).map((hold) => (
          <LegalHoldCard key={hold.id} hold={hold} onRelease={setReleasing} />
        ))}
      </div>
      {workspaceHolds.data?.length === 0 && orgHolds.data?.length === 0 ? (
        <Card className="border border-dashed border-border/70 p-6 text-center text-muted-foreground">
          {t('governance.legalHold.empty')}
        </Card>
      ) : null}
      <CreateLegalHoldModal
        open={creating}
        onOpenChange={setCreating}
        workspaceId={workspaceId}
        onCreated={() => void workspaceHolds.refresh()}
      />
      <ReleaseLegalHoldModal
        open={Boolean(releasing)}
        onOpenChange={(open) => !open && setReleasing(null)}
        holdId={releasing}
        onReleased={() => void workspaceHolds.refresh()}
      />
    </div>
  );
}
