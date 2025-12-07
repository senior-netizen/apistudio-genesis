import { useEffect, useState } from 'react';
import { Badge, Button, Card, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, IconButton, Skeleton } from '@sdl/ui';
import { MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import { can } from '@sdl/frontend/utils/roles';
import { useAuth } from '../../../modules/auth/AuthProvider';
import { useI18n } from '../../../lib/i18n';
import { useGovernanceGet } from '../hooks/useGovernanceApi';

interface BackupItem {
  id: string;
  createdAt: string;
  status: string;
  sizeBytes?: number;
  initiator?: { name?: string };
  regionCode?: string;
  type?: string;
  legalHold?: boolean;
}

function formatSize(bytes?: number) {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function BackupListItem({ backup, onDeleted }: { backup: BackupItem; onDeleted: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const deletable = !backup.legalHold && can(user, 'backup:delete');

  const handleDelete = async () => {
    await axios.delete(`/api/backups/${backup.id}`);
    onDeleted();
  };

  return (
    <Card className="flex items-center justify-between border border-border/60 bg-background/80 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{new Date(backup.createdAt).toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">
          {backup.status} · {backup.regionCode || '—'} · {backup.type || 'snapshot'} · {formatSize(backup.sizeBytes)}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {backup.legalHold ? <Badge variant="outline">{t('governance.backups.legalHold')}</Badge> : null}
        <Badge variant="secondary">{backup.initiator?.name || t('governance.backups.unknown')}</Badge>
        {deletable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleDelete}>{t('governance.backups.delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </Card>
  );
}

export function BackupList({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const backups = useGovernanceGet<BackupItem[]>(`/api/backups?workspaceId=${workspaceId}`);
  const [creating, setCreating] = useState(false);

  const canCreate = can(user, 'backup:create');

  const createBackup = async () => {
    setCreating(true);
    try {
      await axios.post(`/api/backups/workspace/${workspaceId}`);
      void backups.refresh();
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/api/governance/stream?workspaceId=${workspaceId}`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const relevantEvents = [
          'workspace.backup_created',
          'workspace.backup_deleted',
          'workspace.restore_completed',
        ];
        if (relevantEvents.includes(payload?.type)) {
          void backups.refresh();
        }
      } catch (error) {
        console.warn('[governance] unable to parse stream message', error);
      }
    };
    return () => ws.close();
  }, [backups, workspaceId]);

  if (backups.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (backups.error) {
    return <p className="text-sm text-destructive">{backups.error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('governance.backups.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('governance.backups.subtitle')}</p>
        </div>
        {canCreate ? (
          <Button onClick={createBackup} disabled={creating}>
            {creating ? t('governance.backups.creating') : t('governance.backups.create')}
          </Button>
        ) : null}
      </div>
      {backups.data && backups.data.length > 0 ? (
        <div className="space-y-3">
          {backups.data.map((backup) => (
            <BackupListItem key={backup.id} backup={backup} onDeleted={() => void backups.refresh()} />
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/70 p-6 text-center text-muted-foreground">
          {t('governance.backups.empty')}
        </Card>
      )}
    </div>
  );
}
