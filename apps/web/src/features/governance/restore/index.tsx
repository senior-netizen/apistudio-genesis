import { useEffect, useState } from 'react';
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, RadioGroup, RadioGroupItem, Skeleton } from '@sdl/ui';
import axios from 'axios';
import { can } from '@sdl/frontend/utils/roles';
import { useAuth } from '../../../modules/auth/AuthProvider';
import { useI18n } from '../../../lib/i18n';
import { useGovernanceGet } from '../hooks/useGovernanceApi';

interface BackupSummary {
  id: string;
  createdAt: string;
  regionCode?: string;
  status: string;
}

function RestoreConfirmationModal({
  open,
  onOpenChange,
  backup,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backup: BackupSummary | null;
  workspaceId: string;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'inplace' | 'new'>('inplace');
  const [targetName, setTargetName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    if (!backup) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/backups/${backup.id}/restore`, {
        workspaceId,
        mode,
        targetName: mode === 'new' ? targetName : undefined,
      });
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
          <DialogTitle>{t('governance.restore.confirm')}</DialogTitle>
        </DialogHeader>
        {backup ? (
          <div className="space-y-4">
            <Card className="border border-border/60 bg-muted/40 p-3 text-sm">
              <p>{new Date(backup.createdAt).toLocaleString()}</p>
              <p className="text-muted-foreground">{backup.regionCode || '—'} · {backup.status}</p>
            </Card>
            <div>
              <Label>{t('governance.restore.mode')}</Label>
              <RadioGroup className="mt-2" value={mode} onValueChange={(value) => setMode(value as 'inplace' | 'new')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inplace" id="mode-inplace" />
                  <Label htmlFor="mode-inplace">{t('governance.restore.inplace')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="mode-new" />
                  <Label htmlFor="mode-new">{t('governance.restore.newWorkspace')}</Label>
                </div>
              </RadioGroup>
            </div>
            {mode === 'new' ? (
              <div className="space-y-2">
                <Label htmlFor="targetName">{t('governance.restore.targetName')}</Label>
                <Input id="targetName" value={targetName} onChange={(e) => setTargetName(e.target.value)} />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={execute} disabled={submitting || !backup}>
            {submitting ? t('common.loading') : t('governance.restore.execute')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestoreWizard({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const backups = useGovernanceGet<BackupSummary[]>(`/api/backups?workspaceId=${workspaceId}`);
  const [selected, setSelected] = useState<BackupSummary | null>(null);
  const [confirming, setConfirming] = useState(false);

  const allowed = can(user, 'backup:restore');

  useEffect(() => {
    const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/api/governance/stream?workspaceId=${workspaceId}`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'workspace.restore_completed') {
          void backups.refresh();
        }
      } catch (err) {
        console.warn('[governance] stream parse failed', err);
      }
    };
    return () => ws.close();
  }, [backups, workspaceId]);

  if (!allowed) {
    return <Card className="border border-border/70 p-6 text-muted-foreground">{t('governance.restore.forbidden')}</Card>;
  }

  if (backups.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (backups.error) {
    return <p className="text-sm text-destructive">{backups.error}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{t('governance.restore.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('governance.restore.subtitle')}</p>
      </div>
      {backups.data && backups.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {backups.data.map((backup) => (
            <Card
              key={backup.id}
              className={`cursor-pointer border p-3 transition ${selected?.id === backup.id ? 'border-primary' : 'border-border/60'}`}
              onClick={() => setSelected(backup)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{new Date(backup.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{backup.regionCode || '—'}</p>
                </div>
                <Badge variant="outline">{backup.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/70 p-6 text-center text-muted-foreground">
          {t('governance.restore.empty')}
        </Card>
      )}
      <Button onClick={() => setConfirming(true)} disabled={!selected}>
        {t('governance.restore.continue')}
      </Button>
      <RestoreConfirmationModal open={confirming} onOpenChange={setConfirming} backup={selected} workspaceId={workspaceId} />
    </div>
  );
}
