import { useMemo, useState } from 'react';
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Skeleton } from '@sdl/ui';
import axios from 'axios';
import { can } from '@sdl/frontend/utils/roles';
import { useAuth } from '../../../modules/auth/AuthProvider';
import { useI18n } from '../../../lib/i18n';
import { useGovernanceGet, useGovernanceMutation } from '../hooks/useGovernanceApi';

interface RetentionPolicy {
  id?: string;
  retentionDays: number;
  includes?: string[];
  locked?: boolean;
  override?: boolean;
  updatedAt?: string;
  createdBy?: { name?: string; email?: string } | null;
}

interface RetentionResponse {
  policy: RetentionPolicy | null;
}

function RetentionPolicyViewer({ title, policy }: { title: string; policy: RetentionPolicy | null }) {
  if (!policy) {
    return (
      <Card className="border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        {title}
      </Card>
    );
  }
  return (
    <Card className="border border-border/70 bg-background/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-xl font-semibold text-foreground">{policy.retentionDays} days</h3>
        </div>
        {policy.locked ? <Badge variant="outline">Locked</Badge> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-foreground">
        <div>
          <dt className="text-muted-foreground">Includes</dt>
          <dd className="mt-1 space-x-2">
            {(policy.includes ?? ['backups', 'logs', 'events']).map((entry) => (
              <Badge key={entry} variant="secondary">
                {entry}
              </Badge>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last updated</dt>
          <dd className="mt-1">{policy.updatedAt ? new Date(policy.updatedAt).toLocaleString() : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created by</dt>
          <dd className="mt-1">{policy.createdBy?.name || policy.createdBy?.email || 'system'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Override</dt>
          <dd className="mt-1">{policy.override ? 'Workspace-specific' : 'Organization default'}</dd>
        </div>
      </dl>
    </Card>
  );
}

function CreateOrEditRetentionModal({
  open,
  onOpenChange,
  workspaceId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initial?: RetentionPolicy | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [retentionDays, setRetentionDays] = useState<string>(() => String(initial?.retentionDays ?? 30));
  const mutation = useGovernanceMutation(async (payload: { retentionDays: number }) => {
    if (initial?.id) {
      const response = await axios.patch(`/api/retention/workspace/${workspaceId}`, payload);
      return response.data;
    }
    const response = await axios.post(`/api/retention/workspace/${workspaceId}`, payload);
    return response.data;
  });

  const handleSubmit = async () => {
    await mutation.mutate({ retentionDays: Number(retentionDays) });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('governance.retention.editTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="retentionDays">{t('governance.retention.retentionDays')}</Label>
          <Input
            id="retentionDays"
            type="number"
            min={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
          />
          {mutation.error ? <p className="text-sm text-destructive">{mutation.error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.loading}>
            {mutation.loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RetentionPolicyPanel({ workspaceId, orgId }: { workspaceId: string; orgId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const workspacePolicy = useGovernanceGet<RetentionResponse>(`/api/retention/workspace/${workspaceId}`);
  const orgPolicy = useGovernanceGet<RetentionResponse>(`/api/retention/org/${orgId}`);

  const policy = useMemo(() => workspacePolicy.data?.policy ?? orgPolicy.data?.policy ?? null, [workspacePolicy.data, orgPolicy.data]);

  const canEdit = can(user, 'retention:update');

  if (workspacePolicy.loading || orgPolicy.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (workspacePolicy.error || orgPolicy.error) {
    return <p className="text-sm text-destructive">{workspacePolicy.error || orgPolicy.error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('governance.retention.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('governance.retention.subtitle')}</p>
        </div>
        {canEdit ? (
          <div className="space-x-2">
            {workspacePolicy.data?.policy?.override ? (
              <Button
                variant="outline"
                onClick={async () => {
                  await axios.post(`/api/retention/workspace/${workspaceId}`, {
                    retentionDays: orgPolicy.data?.policy?.retentionDays ?? 30,
                  });
                  void workspacePolicy.refresh();
                }}
              >
                {t('governance.retention.restoreDefault')}
              </Button>
            ) : null}
            <Button onClick={() => setEditing(true)}>{t('governance.retention.edit')}</Button>
          </div>
        ) : null}
      </div>
      <RetentionPolicyViewer title={t('governance.retention.effectivePolicy')} policy={policy} />
      <div className="grid grid-cols-2 gap-4">
        <RetentionPolicyViewer title={t('governance.retention.workspacePolicy')} policy={workspacePolicy.data?.policy ?? null} />
        <RetentionPolicyViewer title={t('governance.retention.orgPolicy')} policy={orgPolicy.data?.policy ?? null} />
      </div>
      <CreateOrEditRetentionModal
        open={editing}
        onOpenChange={setEditing}
        workspaceId={workspaceId}
        initial={workspacePolicy.data?.policy ?? orgPolicy.data?.policy}
        onSaved={() => void workspacePolicy.refresh()}
      />
    </div>
  );
}
