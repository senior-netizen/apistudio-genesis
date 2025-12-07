import { Card, Skeleton } from '@sdl/ui';
import { useI18n } from '../../../lib/i18n';
import { useGovernanceGet } from '../hooks/useGovernanceApi';

interface OrgResponse {
  region?: { code?: string; name?: string; capabilities?: string[]; residencyMode?: string; dataCenter?: string; keyAlias?: string };
}

interface WorkspaceResponse {
  region?: { code?: string; name?: string; capabilities?: string[]; residencyMode?: string; dataCenter?: string; keyAlias?: string };
}

export function RegionOverviewPanel({ workspaceId, orgId }: { workspaceId: string; orgId: string }) {
  const { t } = useI18n();
  const org = useGovernanceGet<OrgResponse>(`/api/organization/${orgId}`);
  const workspace = useGovernanceGet<WorkspaceResponse>(`/api/workspaces/${workspaceId}`);

  if (org.loading || workspace.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (org.error || workspace.error) {
    return <p className="text-sm text-destructive">{org.error || workspace.error}</p>;
  }

  const orgRegion = org.data?.region;
  const wsRegion = workspace.data?.region;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{t('governance.region.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('governance.region.subtitle')}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="border border-border/70 bg-background/70 p-4">
          <h3 className="text-lg font-semibold">{t('governance.region.workspace')}</h3>
          <p className="text-sm text-muted-foreground">{wsRegion?.name || '—'} ({wsRegion?.code || '—'})</p>
          <p className="text-xs text-muted-foreground">{wsRegion?.residencyMode || t('governance.region.residency')}</p>
          <p className="text-xs text-muted-foreground">{wsRegion?.dataCenter || t('governance.region.dataCenter')}</p>
          <p className="text-xs text-muted-foreground">{wsRegion?.keyAlias || t('governance.region.keyAlias')}</p>
        </Card>
        <Card className="border border-border/70 bg-background/70 p-4">
          <h3 className="text-lg font-semibold">{t('governance.region.org')}</h3>
          <p className="text-sm text-muted-foreground">{orgRegion?.name || '—'} ({orgRegion?.code || '—'})</p>
          <p className="text-xs text-muted-foreground">{orgRegion?.residencyMode || t('governance.region.residency')}</p>
          <p className="text-xs text-muted-foreground">{orgRegion?.dataCenter || t('governance.region.dataCenter')}</p>
          <p className="text-xs text-muted-foreground">{orgRegion?.keyAlias || t('governance.region.keyAlias')}</p>
        </Card>
      </div>
    </div>
  );
}
